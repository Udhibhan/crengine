import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { extractBeliefs, detectContradictions, detectRelations } from '@/lib/ai'

// GET /api/beliefs — list all beliefs for the current user
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: beliefs, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ beliefs })
}

// POST /api/beliefs — extract beliefs from raw text, save, analyze contradictions & relations
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rawInput } = await req.json()

  if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length < 10) {
    return NextResponse.json({ error: 'rawInput must be at least 10 characters.' }, { status: 400 })
  }

  // 1. Extract structured beliefs from raw text
  let extracted
  try {
    extracted = await extractBeliefs(rawInput)
  } catch (e) {
    console.error('Belief extraction failed:', e)
    return NextResponse.json({ error: 'AI extraction failed. Check your API key.' }, { status: 500 })
  }

  if (!extracted || extracted.length === 0) {
    return NextResponse.json({ error: 'No beliefs could be extracted from this text.' }, { status: 422 })
  }

  // 2. Save extracted beliefs to Supabase
  const beliefsToInsert = extracted.map((b) => ({
    user_id: user.id,
    content: b.content,
    category: b.category,
    confidence_score: b.confidence_score,
    raw_input: rawInput,
  }))

  const { data: savedBeliefs, error: insertError } = await supabase
    .from('beliefs')
    .insert(beliefsToInsert)
    .select()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 3. Get existing beliefs for comparison
  const { data: existingBeliefs } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60)

  const previousBeliefs = existingBeliefs?.filter(
    (b) => !savedBeliefs?.find((nb) => nb.id === b.id)
  ) || []

  // 4. Detect contradictions & relations for each new belief (run in parallel)
  const allContradictions: Array<{
    belief_id: string
    belief_content: string
    contradiction_score: number
    explanation: string
  }> = []

  if (previousBeliefs.length > 0 && savedBeliefs) {
    await Promise.all(
      savedBeliefs.map(async (newBelief) => {
        try {
          // Contradiction detection
          const contradictionResult = await detectContradictions(newBelief.content, previousBeliefs)

          if (contradictionResult.has_contradiction && contradictionResult.contradictions.length > 0) {
            allContradictions.push(...contradictionResult.contradictions)

            // Save contradiction relations
            const contradictionRelations = contradictionResult.contradictions
              .filter((c) => c.contradiction_score > 0.35)
              .map((c) => ({
                belief_id_1: newBelief.id,
                belief_id_2: c.belief_id,
                relation_type: 'contradicts' as const,
                strength_score: c.contradiction_score,
                explanation: c.explanation,
              }))

            if (contradictionRelations.length > 0) {
              await supabase.from('belief_relations').insert(contradictionRelations)
            }
          }

          // Relation detection (supports, evolves_from)
          const relations = await detectRelations(newBelief, previousBeliefs)
          const nonContradictingRelations = relations.filter(
            (r) => r.relation_type !== 'contradicts'
          )

          if (nonContradictingRelations.length > 0) {
            await supabase.from('belief_relations').insert(
              nonContradictingRelations.map((r) => ({
                belief_id_1: newBelief.id,
                belief_id_2: r.belief_id,
                relation_type: r.relation_type,
                strength_score: r.strength_score,
                explanation: r.explanation,
              }))
            )
          }
        } catch (e) {
          // Non-fatal — log and continue
          console.warn('Contradiction/relation detection failed for belief:', newBelief.id, e)
        }
      })
    )
  }

  return NextResponse.json({
    beliefs: savedBeliefs,
    contradictions: allContradictions,
    count: savedBeliefs?.length || 0,
  })
}
