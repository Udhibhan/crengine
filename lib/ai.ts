import Groq from 'groq-sdk'
import type {
  Belief,
  ExtractedBelief,
  ContradictionAnalysis,
  AIInsight,
  ChatMessage,
} from './types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

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
  const userPrompt = 'Extract ALL distinct beliefs from this text. Return ONLY a JSON array.\n\n'
    + 'Each object must have:\n'
    + '- "content": string — the belief as a clear direct statement\n'
    + '- "category": one of: philosophy, identity, habit, relationships, career, worldview, ethics, emotion, general\n'
    + '- "confidence_score": float 0.0 to 1.0\n\n'
    + 'Rules: Extract 1-8 beliefs. Only actual claims not questions.\n'
    + 'vague thoughts = 0.3-0.5 confidence. Certain claims = 0.8-1.0 confidence.\n\n'
    + 'Text: "' + rawText + '"\n\n'
    + 'Return ONLY the JSON array, nothing else.'

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'You are a cognitive analyst. Return ONLY a raw JSON array. No markdown, no explanation.' },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const arr = extractArray(cleanJSON(content))
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    return []
  }
}

export async function detectContradictions(
  newBelief: string,
  existingBeliefs: Belief[]
): Promise<ContradictionAnalysis> {
  if (existingBeliefs.length === 0) return { has_contradiction: false, contradictions: [] }

  const beliefsJSON = JSON.stringify(
    existingBeliefs.slice(-50).map((b) => ({ id: b.id, content: b.content, category: b.category }))
  )

  const userPrompt = 'You are comparing beliefs that ONE person has stated about themselves.\n\n'
    + 'New belief this person just stated: "' + newBelief + '"\n\n'
    + 'Other beliefs this same person has previously stated:\n' + beliefsJSON + '\n\n'
    + 'YOUR ONLY JOB: find cases where THIS PERSON directly contradicts THEMSELVES.\n\n'
    + 'ABSOLUTE RULES:\n'
    + '- You have NO opinion. You do NOT know what is philosophically consistent or inconsistent in general.\n'
    + '- You ONLY look at what this specific person has said.\n'
    + '- A contradiction = this person said X, and now they are saying the direct opposite of X.\n'
    + '- Both statements must be about the EXACT SAME subject.\n'
    + '- Different subjects = never a contradiction, even if you personally think they conflict.\n'
    + '- DO NOT use external philosophical knowledge or general opinions.\n'
    + '- DO NOT flag beliefs from different categories as contradictions.\n'
    + '- Only flag if score is above 0.75.\n'
    + '- If the two beliefs could both be true at the same time = not a contradiction.\n'
    + '- When in doubt = not a contradiction.\n\n'
    + 'Return ONLY this JSON:\n'
    + '{"has_contradiction":false,"contradictions":[]}\n\n'
    + 'Return ONLY raw JSON, nothing else.'

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 2000,
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'You compare a persons own statements to find self-contradictions only. Return ONLY raw JSON. No markdown. No external opinions.' },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const obj = extractObject(cleanJSON(content))
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
  const beliefContext = userBeliefs.length > 0
    ? userBeliefs.slice(-30).map((b, i) =>
        '[' + (i + 1) + '] (' + b.category + ', ' + Math.round(b.confidence_score * 100) + '%) "' + b.content + '"'
      ).join('\n')
    : 'No beliefs recorded yet.'

  const systemPrompt = 'You are the mirror of the mind. Ancient, precise, unsentimental.\n\n'
    + 'Your nature:\n'
    + '- You speak like a sage who has seen through every illusion — calm, not aggressive\n'
    + '- You do not list what the person said back to them. You already know it.\n'
    + '- You synthesize, distill, conclude. Never repeat or summarize verbatim.\n'
    + '- You find the ONE thing worth examining in what they said and go deep on that.\n'
    + '- You are not a debate partner. You are a scalpel.\n'
    + '- You only reference contradictions this person created with their OWN past words.\n'
    + '- You do not impose external philosophy or general opinion.\n\n'
    + 'User belief system:\n' + beliefContext + '\n\n'
    + 'Rules:\n'
    + '- 100-200 words maximum. No padding.\n'
    + '- Never restate what they just said\n'
    + '- Never list bullet points\n'
    + '- Speak in flowing prose like a philosopher, not a chatbot\n'
    + '- Only cite past beliefs if they directly conflict with something just said\n'
    + '- End with ONE question in *italics* that cuts to the root'

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
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
    return [{
      type: 'pattern',
      description: 'Add more beliefs to unlock cognitive pattern analysis. Need at least 3 data points.',
      severity: 'low',
      related_belief_ids: [],
    }]
  }

  const beliefsJSON = JSON.stringify(
    beliefs.map((b) => ({ id: b.id, content: b.content, category: b.category, confidence_score: b.confidence_score }))
  )

  const userPrompt = 'Analyze this ONE persons belief system for patterns and self-contradictions only.\n\n'
    + 'IMPORTANT: Only identify contradictions where this person said directly opposing things.\n'
    + 'Do not use external philosophical knowledge or general opinions.\n\n'
    + 'BELIEFS: ' + beliefsJSON + '\n\n'
    + 'RELATIONS: ' + JSON.stringify(relations) + '\n\n'
    + 'Generate 4-7 insights. Return ONLY a JSON array:\n'
    + '[{"type":"contradiction","description":"string","severity":"high","related_belief_ids":["uuid"]}]\n\n'
    + 'type = contradiction or bias or pattern\n'
    + 'severity = low or medium or high\n'
    + 'Be specific, cite actual quotes from the beliefs above.\n'
    + 'Return ONLY the raw JSON array, nothing else.'

  const response = await groq.chat.completions.create({
    model: DEEP_MODEL,
    max_tokens: 3000,
    temperature: 0.4,
    messages: [
      { role: 'system', content: 'You analyze a persons own belief system. Return ONLY a raw JSON array. No markdown.' },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const arr = extractArray(cleanJSON(content))
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    return []
  }
}

export async function detectRelations(
  newBelief: Belief,
  existingBeliefs: Belief[]
): Promise<Array<{ belief_id: string; relation_type: 'supports' | 'contradicts' | 'evolves_from'; strength_score: number; explanation: string }>> {
  if (existingBeliefs.length === 0) return []

  const existingJSON = JSON.stringify(
    existingBeliefs.slice(-30).map((b) => ({ id: b.id, content: b.content, category: b.category }))
  )

  const userPrompt = 'How does this new belief relate to existing beliefs from the same person?\n\n'
    + 'New belief: {"id":"' + newBelief.id + '","content":"' + newBelief.content + '","category":"' + newBelief.category + '"}\n\n'
    + 'Existing: ' + existingJSON + '\n\n'
    + 'Return ONLY a JSON array, max 5 items, strength_score above 0.3:\n'
    + '[{"belief_id":"uuid","relation_type":"supports","strength_score":0.8,"explanation":"string"}]\n\n'
    + 'relation_type = supports or contradicts or evolves_from\n'
    + 'Only include where beliefs are clearly about the same topic.\n'
    + 'Return ONLY the raw JSON array, nothing else.'

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You detect belief relationships. Return ONLY a raw JSON array. No markdown.' },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const arr = extractArray(cleanJSON(content))
    if (!arr) return []
    return JSON.parse(arr)
  } catch {
    return []
  }
}

export async function generateActionPlan(beliefs: Belief[], insights: AIInsight[]): Promise<string> {
  if (beliefs.length < 2) return 'Record more beliefs to unlock your personalized action plan.'

  const beliefLines = beliefs.slice(-20)
    .map((b) => '- [' + b.category + '] "' + b.content + '" (confidence: ' + Math.round(b.confidence_score * 100) + '%)')
    .join('\n')

  const insightLines = insights
    .map((i) => '- [' + i.type + '/' + i.severity + '] ' + i.description)
    .join('\n')

  const userPrompt = 'Generate a precise action plan based on this persons own belief system.\n\n'
    + 'BELIEFS:\n' + beliefLines + '\n\n'
    + 'PATTERNS:\n' + insightLines + '\n\n'
    + 'Write in markdown with exactly these sections:\n\n'
    + '## Immediate Actions (this week)\n'
    + '3-4 specific concrete actions\n\n'
    + '## Belief Experiments (this month)\n'
    + '2-3 experiments to test beliefs in practice\n\n'
    + '## Blind Spots to Investigate\n'
    + '2-3 suspicious gaps\n\n'
    + '## Warning\n'
    + 'One blunt statement about the most dangerous pattern\n\n'
    + 'Be specific. Only reference what this person actually said.'

  const response = await groq.chat.completions.create({
    model: DEEP_MODEL,
    max_tokens: 1500,
    temperature: 0.6,
    messages: [
      { role: 'system', content: 'You are a precision cognitive coach. Generate action plans in markdown.' },
      { role: 'user', content: userPrompt },
    ],
  })

  return response.choices[0]?.message?.content || ''
}
