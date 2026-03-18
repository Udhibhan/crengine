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
  const userPrompt = 'Analyze this text and extract only genuine beliefs, convictions, or personal positions.\n\n'
    + 'SKIP IT ENTIRELY and return [] if the text is:\n'
    + '- A simple reply like yes, no, okay, thanks, I agree, sure, of course\n'
    + '- A question with no stated position\n'
    + '- Small talk or filler with no actual claim\n'
    + '- A continuation word or phrase with no new belief\n\n'
    + 'EXTRACT if the text contains a personal conviction, value, opinion, or worldview claim.\n\n'
    + 'Each object must have:\n'
    + '- "content": the belief as one clear declarative sentence\n'
    + '- "category": one of: philosophy, identity, habit, relationships, career, worldview, ethics, emotion, general\n'
    + '- "confidence_score": precise float e.g. 0.73 or 0.41 — NOT round numbers like 0.5 or 0.8\n\n'
    + 'Rules:\n'
    + '- Extract 1-4 beliefs maximum. Prefer fewer, more precise beliefs over many vague ones.\n'
    + '- Do NOT split one belief into multiple similar beliefs.\n'
    + '- Do NOT extract the same idea twice with different words.\n\n'
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
    existingBeliefs.slice(-30).map((b) => ({ id: b.id, content: b.content }))
  )

  const userPrompt = 'One person has made these statements over time. Find ONLY cases where they directly contradict themselves.\n\n'
    + 'NEW STATEMENT: "' + newBelief + '"\n\n'
    + 'PREVIOUS STATEMENTS:\n' + beliefsJSON + '\n\n'
    + 'A REAL contradiction means:\n'
    + '- Statement A says X is true\n'
    + '- Statement B says X is false or impossible\n'
    + '- They are about the EXACT SAME specific thing\n'
    + '- They CANNOT both be true at the same time\n\n'
    + 'NOT a contradiction:\n'
    + '- Different topics\n'
    + '- Different contexts or situations\n'
    + '- Nuance or qualification\n'
    + '- Things that could both be true\n'
    + '- Your own opinion about what conflicts\n\n'
    + 'If you find a real contradiction, estimate the score as a precise decimal like 0.83 or 0.91 based on how directly opposed they are. Do not use round numbers like 0.8 or 0.6.\n\n'
    + 'If there is no clear self-contradiction, return has_contradiction: false.\n\n'
    + 'Return ONLY raw JSON: {"has_contradiction":false,"contradictions":[]}'

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 1000,
    temperature: 0.0,
    messages: [
      { role: 'system', content: 'You find only genuine self-contradictions. Return ONLY raw JSON. Default to no contradiction when unsure.' },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = response.choices[0]?.message?.content || ''
  try {
    const obj = extractObject(cleanJSON(raw))
    if (!obj) return { has_contradiction: false, contradictions: [] }
    const parsed = JSON.parse(obj) as ContradictionAnalysis
    // Filter to only high-confidence contradictions
    parsed.contradictions = parsed.contradictions.filter(c => c.contradiction_score >= 0.80)
    parsed.has_contradiction = parsed.contradictions.length > 0
    return parsed
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

  const systemPrompt = 'You are the mirror of the mind. Ancient, calm, unsentimental.\n\n'
    + 'You speak like a wise elder who has seen every self-deception — not aggressive, not preachy.\n'
    + 'You notice what the person is really saying underneath the words.\n'
    + 'You find the hidden assumption, the unexamined belief, the quiet contradiction.\n'
    + 'You speak plainly. No jargon. No complex words to seem smart.\n'
    + 'You say true things in simple language that land like a stone in still water.\n'
    + 'You do not list. You do not use headers. You speak in one flowing paragraph.\n'
    + 'You do not repeat what they said. You illuminate what they meant.\n'
    + 'Only reference past beliefs if they directly contradict something just said.\n\n'
    + 'User belief system:\n' + beliefContext + '\n\n'
    + 'RULES:\n'
    + '- 80 to 120 words. No more, no less.\n'
    + '- One paragraph of real insight — not surface observations\n'
    + '- Plain language. Sentences a thoughtful 16 year old can understand.\n'
    + '- End with ONE question in *asterisks* that makes them stop and think\n'
    + '- The question should cut to the root of what they are avoiding\n'
    + '- No bullet points. No lists. No headers. Pure prose.'

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

  const userPrompt = 'Does this new belief have a clear, specific relationship to any existing beliefs?\n\n'
    + 'New belief: "' + newBelief.content + '"\n\n'
    + 'Existing beliefs:\n' + existingJSON + '\n\n'
    + 'Only include a relation if:\n'
    + '- Both beliefs are clearly about the same specific topic\n'
    + '- The relationship is obvious and strong\n'
    + '- strength_score is a precise decimal like 0.87, not a round number\n\n'
    + 'Types:\n'
    + '- supports: new belief reinforces the existing one\n'
    + '- contradicts: new belief directly opposes the existing one (only if same topic, opposite claim)\n'
    + '- evolves_from: new belief is a development of the existing one\n\n'
    + 'If no clear strong relation exists, return [].\n'
    + 'Max 2 relations. Return ONLY the raw JSON array.'

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