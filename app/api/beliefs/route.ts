import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { extractBeliefs, detectContradictions, detectRelations } from '@/lib/ai'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: beliefs, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ beliefs: beliefs || [] })
}

// Compare two belief strings — are they saying essentially the same thing?
function isSameIdea(a: string, b: string): boolean {
  const clean = (s: string) => s
    .toLowerCase()
    .replace(/\b(is|are|was|were|a|an|the|it|its|not|no|so|very|quite|really|just|also|too|for|with|and|or|but|in|on|at|to|of|my|i|you|we|they|he|she|this|that|these|those|always|never|often|sometimes|can|cant|cannot|will|wont|would|should|dont|do|does|be|been|have|has|had)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const ca = clean(a)
  const cb = clean(b)

  if (ca === cb) return true
  if (ca.length < 8 || cb.length < 8) return false

  const wordsA = ca.split(' ').filter(w => w.length > 3)
  const wordsB = new Set(cb.split(' ').filter(w => w.length > 3))
  if (wordsA.length === 0 || wordsB.size === 0) return false

  const overlap = wordsA.filter(w => wordsB.has(w)).length
  const ratio = overlap / Math.min(wordsA.length, wordsB.size)
  return ratio >= 0.65
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rawInput } = await req.json()
  if (!rawInput || rawInput.trim().length < 4) {
    return NextResponse.json({ beliefs: [], contradictions: [] })
  }

  // Extract beliefs — AI will return [] for non-belief inputs
  let extracted
  try {
    extracted = await extractBeliefs(rawInput)
  } catch {
    return NextResponse.json({ error: 'AI failed.' }, { status: 500 })
  }

  // AI returned nothing — not a belief statement, just process as dialogue
  if (!extracted || extracted.length === 0) {
    return NextResponse.json({ beliefs: [], contradictions: [], count: 0 })
  }

  // Fetch existing beliefs
  const { data: existingRaw } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(150)

  const existing = existingRaw || []
  const savedBeliefs = []

  for (const b of extracted) {
    // Check for duplicate
    const duplicate = existing.find(e => isSameIdea(e.content, b.content))

    if (duplicate) {
      // Bump confidence slightly — same idea stated again = more certain
      const newScore = Math.min(0.99, duplicate.confidence_score + 0.04)
      await supabase
        .from('beliefs')
        .update({ confidence_score: parseFloat(newScore.toFixed(2)) })
        .eq('id', duplicate.id)
      savedBeliefs.push({ ...duplicate, confidence_score: newScore, _isDuplicate: true })
    } else {
      const { data: inserted } = await supabase
        .from('beliefs')
        .insert({
          user_id: user.id,
          content: b.content,
          category: b.category,
          confidence_score: parseFloat(b.confidence_score.toFixed(2)),
          raw_input: rawInput,
        })
        .select()
        .single()

      if (inserted) {
        savedBeliefs.push(inserted)
        existing.push(inserted)
      }
    }
  }

  // Only process contradictions and relations for genuinely new beliefs
  const newBeliefs = savedBeliefs.filter(b => !b._isDuplicate)
  const previousBeliefs = existing.filter(e => !newBeliefs.find(n => n.id === e.id))
  const allContradictions: Array<{ belief_id: string; belief_content: string; contradiction_score: number; explanation: string }> = []

  if (newBeliefs.length > 0 && previousBeliefs.length > 0) {
    for (const nb of newBeliefs) {
      try {
        // Contradictions
        const result = await detectContradictions(nb.content, previousBeliefs)
        if (result.has_contradiction && result.contradictions.length > 0) {
          allContradictions.push(...result.contradictions)
          await supabase.from('belief_relations').insert(
            result.contradictions.map(c => ({
              belief_id_1: nb.id,
              belief_id_2: c.belief_id,
              relation_type: 'contradicts',
              strength_score: parseFloat(c.contradiction_score.toFixed(2)),
              explanation: c.explanation,
            }))
          )
        }

        // Other relations
        const relations = await detectRelations(nb, previousBeliefs)
        const nonContra = relations.filter(r => r.relation_type !== 'contradicts')
        if (nonContra.length > 0) {
          await supabase.from('belief_relations').insert(
            nonContra.map(r => ({
              belief_id_1: nb.id,
              belief_id_2: r.belief_id,
              relation_type: r.relation_type,
              strength_score: parseFloat(r.strength_score.toFixed(2)),
              explanation: r.explanation,
            }))
          )
        }
      } catch {}
    }
  }

  return NextResponse.json({
    beliefs: savedBeliefs.map(({ _isDuplicate, ...b }) => b),
    contradictions: allContradictions,
    count: savedBeliefs.length,
  })
}