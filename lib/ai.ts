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

const FAST_MODEL = 'llama-3.1-8b-instant'
const DEEP_MODEL = 'llama-3.3-70b-versatile'

function cleanJSON(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(cleaned.indexOf('\n') + 1)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, cleaned.lastIndexOf('```'))
  }
  return cleaned.trim()
}

function extractArray(text: string): string | null {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1) return null
  return text.slice(start, end + 1)
}

function extractObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  return text.slice(start, end + 1)
}

export async function extractBeliefs(rawText: string): Promise<ExtractedBelief[]> {
  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You are a cognitive analyst. Return ONLY a raw JSON array. No markdown, no explanation, no code fences.',
      },
      {
        role: 'user',
        content: `Extract ALL distinct beliefs from this text. Return ONLY a JSON array.

Each object must have:
- "content": string — the belief as a clear direct statement
- "category": string — one of: philosophy, identity, habit, relationships, career, worldview, ethics, emotion, general
- "confidence_score": float — 0.0 to 1.0

Rules:
- Extract 1-8 beliefs
- Only extract actual claims, not questions
- "I think maybe..." = confidence 0.3-0.5
- "I know that..." = confidence 0.8-1.0

Text: "${rawText}"

Return ONLY the JSON array, nothing else.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const cleaned = cleanJSON(content)
    const arr = extractArray(cleaned)
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    console.error('Belief extraction parse failed:', content)
    return []
  }
}

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
        content: 'You are a strict logical contradiction detector. Return ONLY raw JSON. No markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Detect ONLY genuine logical contradictions between the new belief and existing beliefs.

New belief: "${newBelief}"

Existing beliefs:
${JSON.stringify(beliefsToCheck.map((b) => ({ id: b.id, content: b.content, category: b.category })))}

STRICT RULES:
- Both beliefs must be about the EXACT SAME topic
- They must make directly OPPOSING claims about that same topic
- Different topics = NOT a contradiction
- Nuance or context differences = NOT a contradiction
- Only flag if contradiction_score is above 0.65
- When in doubt, do NOT flag it

Return ONLY this JSON:
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

Return ONLY raw JSON, nothing else.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const cleaned = cleanJSON(content)
    const obj = extractObject(cleaned)
    if (!obj) return { has_contradiction: false, contradictions: [] }
    return JSON.parse(obj) as ContradictionAnalysis
  } catch {
    return { has_contradiction: false, contradictions: [] }
  }
}

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
- Speak with precision, no filler, no pleasantries, no empty empathy
- You are fascinated by the user's internal contradictions, treat them as data
- Ask exactly ONE sharp destabilizing question at the end of each response
- Quote the user's actual beliefs when referencing them
- Tone: Socrates + Nietzsche + cold logic engine

The user's belief system:
${beliefContext}

Rules:
- Keep responses 150-300 words
- Never say I understand or That's a great point
- When you spot a contradiction with a recorded belief, name it explicitly
- End EVERY response with a single probing question wrapped in *asterisks*
- Do not lecture, engage`

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

export async function generateInsights(
  beliefs: Belief[],
  relations: Array<{ relation_type: string; strength_score: number; explanation?: string }>
): Promise<AIInsight[]> {
  if (beliefs.length < 3) {
    return [
      {
        type: 'pattern',
        description: 'Add more beliefs to unlock cognitive pattern analysis. The engine needs at least 3 data points.',
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
        content: 'You are a cognitive pattern analyst. Return ONLY a raw JSON array. No markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Analyze this belief system and return insights as a JSON array.

BELIEFS (${beliefs.length} total):
${JSON.stringify(beliefs.map((b) => ({ id: b.id, content: b.content, category: b.category, confidence_score: b.confidence_score })))}

RELATIONS: ${JSON.stringify(relations)}

Generate 4-7 precise insights. Return ONLY a JSON array:
[
  {
    "type": "contradiction" or "bias" or "pattern",
    "description": "2-3 sentence specific insight naming actual beliefs",
    "severity": "low" or "medium" or "high",
    "related_belief_ids": ["uuid1", "uuid2"]
  }
]

Look for: real logical contradictions, confirmation bias, blind spots, recurring themes, confidence asymmetry.
Be specific, cite actual belief content.
Return ONLY the raw JSON array, nothing else.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const cleaned = cleanJSON(content)
    const arr = extractArray(cleaned)
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    console.error('Insights parse failed:', content)
    return []
  }
}

export async function detectRelations(
  newBelief: Belief,
  existingBeliefs: Belief[]
): Promise
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
        content: 'You detect relationships between beliefs. Return ONLY a raw JSON array. No markdown.',
      },
      {
        role: 'user',
        content: `How does this new belief relate to existing beliefs?

New belief: { "id": "${newBelief.id}", "content": "${newBelief.content}", "category": "${newBelief.category}" }

Existing beliefs:
${JSON.stringify(existingBeliefs.slice(-30).map((b) => ({ id: b.id, content: b.content, category: b.category })))}

Return ONLY a JSON array of significant relations (strength_score above 0.3), max 5:
[
  {
    "belief_id": "uuid",
    "relation_type": "supports" or "contradicts" or "evolves_from",
    "strength_score": 0.0-1.0,
    "explanation": "one precise sentence"
  }
]

Only include relations where beliefs are genuinely about the same topic.
Return ONLY the raw JSON array, nothing else.`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const cleaned = cleanJSON(content)
    const arr = extractArray(cleaned)
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    return []
  }
}

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
        content: 'You are a precision cognitive coach. Generate structured action plans in markdown.',
      },
      {
        role: 'user',
        content: `Generate a precise action plan based on this person's belief system.

BELIEFS:
${beliefs.slice(-20).map((b) => `- [${b.category}] "${b.content}" (confidence: ${Math.round(b.confidence_score * 100)}%)`).join('\n')}

PATTERNS:
${insights.map((i) => `- [${i.type}/${i.severity}] ${i.description}`).join('\n')}

Write in markdown with exactly these sections:

## Immediate Actions (this week)
3-4 specific concrete actions

## Belief Experiments (this month)
2-3 experiments to test beliefs in practice

## Blind Spots to Investigate
2-3 suspicious gaps in the belief system

## Warning
One blunt statement about the most dangerous pattern

Be specific, not generic. Calibrate to THIS person's actual beliefs.`,
      },
    ],
  })

  return response.choices[0]?.message?.content || ''
}
