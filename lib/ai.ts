import Groq from 'groq-sdk'
import type {
  Belief,
  ExtractedBelief,
  ContradictionAnalysis,
  AIInsight,
  ChatMessage,
} from './types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

// =====================================================
// MODEL SELECTION — both free on Groq
// =====================================================
const FAST_MODEL = 'llama-3.1-8b-instant'       // fast extractions & detection
const DEEP_MODEL = 'llama-3.3-70b-versatile'    // deep analysis & dialogue

// =====================================================
// A. BELIEF EXTRACTION
// =====================================================
export async function extractBeliefs(rawText: string): Promise<ExtractedBelief[]> {
  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You are a cognitive analyst. Extract beliefs from text and return ONLY valid JSON arrays. Never add explanation or markdown.',
      },
      {
        role: 'user',
        content: `Extract ALL distinct beliefs, claims, and convictions from the following text. Each belief should be a single, clear, assertive statement.

Return ONLY a valid JSON array. No preamble, no markdown, no explanation.

Each object must have:
- "content": string — the belief as a clear, direct statement
- "category": string — one of: philosophy, identity, habit, relationships, career, worldview, ethics, emotion, general
- "confidence_score": float — 0.0 to 1.0

Rules:
- Extract 1-8 beliefs depending on richness of text
- Rewrite vague thoughts as precise belief statements
- "I think maybe..." → confidence 0.3-0.5
- "I know that..." → confidence 0.8-1.0
- Only extract actual claims, not questions

Text: "${rawText}"`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0])
  } catch {
    console.error('Failed to parse belief extraction:', content)
    return []
  }
}

// =====================================================
// B. CONTRADICTION DETECTION
// =====================================================
export async function detectContradictions(
  newBelief: string,
  existingBeliefs: Belief[]
): Promise<ContradictionAnalysis> {
  if (existingBeliefs.length === 0) {
    return { has_contradiction: false, contradictions: [] }
  }

  const beliefsToCheck = existingBeliefs.slice(-50)

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are a philosophical contradiction detector. Return ONLY valid JSON. Never add explanation outside the JSON.',
      },
      {
        role: 'user',
        content: `Find GENUINE contradictions — logical or ethical inconsistencies, not just differences of opinion.

New belief: "${newBelief}"

Existing beliefs:
${JSON.stringify(beliefsToCheck.map((b) => ({ id: b.id, content: b.content, category: b.category })))}

Return ONLY this JSON structure:
{
  "has_contradiction": boolean,
  "contradictions": [
    {
      "belief_id": "uuid",
      "belief_content": "the contradicting belief",
      "contradiction_score": 0.0-1.0,
      "explanation": "one precise sentence"
    }
  ]
}

Rules:
- Only include contradictions with score > 0.35
- 1.0 = direct logical opposition
- 0.35-0.6 = tension or inconsistency
- Do NOT flag differences in emphasis as contradictions
- If none exist: has_contradiction false, empty array`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return { has_contradiction: false, contradictions: [] }
    return JSON.parse(match[0]) as ContradictionAnalysis
  } catch {
    return { has_contradiction: false, contradictions: [] }
  }
}

// =====================================================
// C. PHILOSOPHICAL DIALOGUE — streaming
// =====================================================
export async function createDialogueStream(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userBeliefs: Belief[]
): Promise<ReadableStream<Uint8Array>> {
  const beliefContext =
    userBeliefs.length > 0
      ? userBeliefs
          .slice(-30)
          .map(
            (b, i) =>
              `[${i + 1}] (${b.category}, confidence: ${Math.round(b.confidence_score * 100)}%) "${b.content}"`
          )
          .join('\n')
      : 'No beliefs recorded yet.'

  const systemPrompt = `You are the Reflective Cognition Engine — a philosophical adversary, not a companion. A cognitive mirror that reflects back with unflinching precision.

Your character:
- Ruthlessly analytical, intellectually rigorous
- You do NOT comfort, validate, or agree for the sake of harmony
- You CHALLENGE every assumption, especially unchallenged ones
- Speak with precision — no filler, no pleasantries, no empty empathy
- You are fascinated by the user's internal contradictions — treat them as data
- Ask exactly ONE sharp, destabilizing question at the end of each response
- Quote the user's actual beliefs when referencing them
- Tone: Socrates + Nietzsche + cold logic engine

The user's belief system:
${beliefContext}

Rules:
- Keep responses 150-300 words
- Never say "I understand" or "That's a great point"
- When you spot a contradiction with a recorded belief, name it explicitly
- End EVERY response with a single probing question wrapped in *asterisks*
- Do not lecture — engage`

  const messages = [
    ...conversationHistory.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const stream = await groq.chat.completions.create({
    model: DEEP_MODEL,
    max_tokens: 1024,
    temperature: 0.8,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })
}

// =====================================================
// D. INSIGHTS GENERATION
// =====================================================
export async function generateInsights(
  beliefs: Belief[],
  relations: Array<{ relation_type: string; strength_score: number; explanation?: string }>
): Promise<AIInsight[]> {
  if (beliefs.length < 3) {
    return [
      {
        type: 'pattern',
        description:
          'Add more beliefs to unlock cognitive pattern analysis. The engine needs at least 3 data points to begin mapping your mind.',
        severity: 'low',
        related_belief_ids: [],
      },
    ]
  }

  const response = await groq.chat.completions.create({
    model: DEEP_MODEL,
    max_tokens: 3000,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: 'You are a cognitive pattern analyst. Return ONLY valid JSON arrays. Never add text outside the JSON.',
      },
      {
        role: 'user',
        content: `Perform a deep analysis of this person's belief system.

BELIEFS (${beliefs.length} total):
${JSON.stringify(beliefs.map((b) => ({ id: b.id, content: b.content, category: b.category, confidence_score: b.confidence_score, created_at: b.created_at })))}

RELATIONS (${relations.length} total):
${JSON.stringify(relations)}

Generate 4-7 precise, actionable insights. Each must be substantive — not generic.

Return ONLY a valid JSON array:
[
  {
    "type": "contradiction" | "bias" | "pattern",
    "description": "2-3 sentence specific insight naming actual beliefs",
    "severity": "low" | "medium" | "high",
    "related_belief_ids": ["uuid1", "uuid2"]
  }
]

Look for:
1. CONTRADICTIONS: logically opposing beliefs (type: contradiction, severity: high)
2. CONFIRMATION BIAS: over-reliance on confirming beliefs (type: bias)
3. COGNITIVE DISSONANCE: incompatible beliefs held simultaneously (type: contradiction)
4. BLIND SPOTS: suspicious absence of beliefs in certain categories (type: pattern)
5. RECURRING THEMES: obsessions, fears, or values reappearing (type: pattern)
6. CONFIDENCE ASYMMETRY: areas where confidence is suspiciously high or low (type: bias)

Be specific. Cite actual belief content. Return ONLY valid JSON.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0])
  } catch {
    console.error('Failed to parse insights:', content)
    return []
  }
}

// =====================================================
// E. RELATION DETECTION
// =====================================================
export async function detectRelations(
  newBelief: Belief,
  existingBeliefs: Belief[]
): Promise<
  Array<{
    belief_id: string
    relation_type: 'supports' | 'contradicts' | 'evolves_from'
    strength_score: number
    explanation: string
  }>
> {
  if (existingBeliefs.length === 0) return []

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You detect relationships between beliefs. Return ONLY valid JSON arrays.',
      },
      {
        role: 'user',
        content: `How does this new belief relate to existing beliefs?

New belief: { "id": "${newBelief.id}", "content": "${newBelief.content}", "category": "${newBelief.category}" }

Existing beliefs:
${JSON.stringify(existingBeliefs.slice(-30).map((b) => ({ id: b.id, content: b.content, category: b.category })))}

Return ONLY a JSON array of significant relations (strength_score > 0.3), max 5:
[
  {
    "belief_id": "uuid of related existing belief",
    "relation_type": "supports" | "contradicts" | "evolves_from",
    "strength_score": 0.0-1.0,
    "explanation": "one precise sentence"
  }
]

- "supports": new belief reinforces the existing one
- "contradicts": new belief opposes the existing one
- "evolves_from": new belief is a development of the existing one

Return ONLY valid JSON.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

// =====================================================
// F. ACTION PLAN GENERATION
// =====================================================
export async function generateActionPlan(
  beliefs: Belief[],
  insights: AIInsight[]
): Promise<string> {
  if (beliefs.length < 2) {
    return 'Record more beliefs to unlock your personalized action plan.'
  }

  const response = await groq.chat.completions.create({
    model: DEEP_MODEL,
    max_tokens: 1500,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: 'You are a precision cognitive coach. Generate structured action plans in markdown. Be specific, not generic.',
      },
      {
        role: 'user',
        content: `Generate a precise action plan based on this person's belief system and cognitive patterns.

BELIEFS:
${beliefs.slice(-20).map((b) => `- [${b.category}] "${b.content}" (confidence: ${Math.round(b.confidence_score * 100)}%)`).join('\n')}

DETECTED PATTERNS:
${insights.map((i) => `- [${i.type}/${i.severity}] ${i.description}`).join('\n')}

Generate a structured plan in markdown with these exact sections:

## Immediate Actions (this week)
3-4 specific, concrete actions to address the most critical contradictions or gaps

## Belief Experiments (this month)
2-3 experiments to test whether held beliefs are actually true in practice

## Blind Spots to Investigate
2-3 areas where the belief system has suspicious gaps

## Warning
One blunt statement about the most dangerous pattern in this belief system

Write with surgical precision. No padding. Calibrate every recommendation to THIS person's specific beliefs.`,
      },
    ],
  })

  return response.choices[0]?.message?.content || ''
}
