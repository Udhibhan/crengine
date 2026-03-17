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
  return NextResponse.json({ beliefs })
}

// Simple similarity check — are two strings about the same thing?
function isSimilar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true

  // Check if one contains most words of the other
  const wordsA = new Set(na.split(' ').filter(w => w.length > 3))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return false

  let overlap = 0
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++ })
  const similarity = overlap / Math.min(wordsA.size, wordsB.size)
  return similarity > 0.7
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rawInput } = await req.json()
  if (!rawInput || rawInput.trim().length < 5) {
    return NextResponse.json({ error: 'Input too short.' }, { status: 400 })
  }

  // Extract beliefs
  let extracted
  try {
    extracted = await extractBeliefs(rawInput)
  } catch {
    return NextResponse.json({ error: 'AI extraction failed.' }, { status: 500 })
  }

  if (!extracted || extracted.length === 0) {
    return NextResponse.json({ error: 'No beliefs extracted.' }, { status: 422 })
  }

  // Get existing beliefs
  const { data: existingBeliefs } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const existing = existingBeliefs || []
  const savedBeliefs = []

  for (const b of extracted) {
    // Check if similar belief already exists
    const duplicate = existing.find(e => isSimilar(e.content, b.content))

    if (duplicate) {
      // Update confidence score (average) instead of creating new
      const newScore = Math.min(1, (duplicate.confidence_score + b.confidence_score) / 2 + 0.05)
      await supabase
        .from('beliefs')
        .update({ confidence_score: newScore })
        .eq('id', duplicate.id)
      savedBeliefs.push({ ...duplicate, confidence_score: newScore })
    } else {
      // Insert new
      const { data: inserted } = await supabase
        .from('beliefs')
        .insert({ user_id: user.id, content: b.content, category: b.category, confidence_score: b.confidence_score, raw_input: rawInput })
        .select()
        .single()
      if (inserted) {
        savedBeliefs.push(inserted)
        existing.push(inserted)
      }
    }
  }

  // Detect contradictions only for truly new beliefs
  const newOnly = savedBeliefs.filter(b => !existingBeliefs?.find(e => e.id === b.id))
  const previousBeliefs = existing.filter(e => !newOnly.find(n => n.id === e.id))
  const allContradictions = []

  if (previousBeliefs.length > 0 && newOnly.length > 0) {
    for (const newBelief of newOnly) {
      try {
        const result = await detectContradictions(newBelief.content, previousBeliefs)
        if (result.has_contradiction) {
          allContradictions.push(...result.contradictions)
          const toInsert = result.contradictions
            .filter(c => c.contradiction_score > 0.75)
            .map(c => ({
              belief_id_1: newBelief.id,
              belief_id_2: c.belief_id,
              relation_type: 'contradicts',
              strength_score: c.contradiction_score,
              explanation: c.explanation,
            }))
          if (toInsert.length > 0) await supabase.from('belief_relations').insert(toInsert)
        }

        const relations = await detectRelations(newBelief, previousBeliefs)
        const nonContra = relations.filter(r => r.relation_type !== 'contradicts')
        if (nonContra.length > 0) {
          await supabase.from('belief_relations').insert(
            nonContra.map(r => ({
              belief_id_1: newBelief.id,
              belief_id_2: r.belief_id,
              relation_type: r.relation_type,
              strength_score: r.strength_score,
              explanation: r.explanation,
            }))
          )
        }
      } catch {}
    }
  }

  return NextResponse.json({ beliefs: savedBeliefs, contradictions: allContradictions, count: savedBeliefs.length })
}
