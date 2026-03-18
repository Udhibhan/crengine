import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const full = searchParams.get('full') === 'true'

  // Get all beliefs for this user
  const { data: beliefs } = await supabase
    .from('beliefs')
    .select('id, content, category, created_at, confidence_score')
    .eq('user_id', user.id)

  if (!beliefs || beliefs.length === 0) {
    return NextResponse.json({ relations: [], contradictions: [] })
  }

  const beliefIds = beliefs.map(b => b.id)
  const beliefMap = new Map(beliefs.map(b => [b.id, b]))

  if (!full) {
    // For graph — return ALL relations
    const { data: relations } = await supabase
      .from('belief_relations')
      .select('*')
      .in('belief_id_1', beliefIds)

    return NextResponse.json({ relations: relations || [] })
  }

  // For contradictions page — fetch contradiction relations
  // Check both directions: belief_id_1 and belief_id_2
  const { data: relationsA } = await supabase
    .from('belief_relations')
    .select('*')
    .in('belief_id_1', beliefIds)
    .eq('relation_type', 'contradicts')

  const { data: relationsB } = await supabase
    .from('belief_relations')
    .select('*')
    .in('belief_id_2', beliefIds)
    .eq('relation_type', 'contradicts')

  const allRelations = [...(relationsA || []), ...(relationsB || [])]

  // Deduplicate by id
  const seen = new Set<string>()
  const uniqueRelations = allRelations.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  const contradictions = uniqueRelations
    .sort((a, b) => b.strength_score - a.strength_score)
    .map(rel => {
      const b1 = beliefMap.get(rel.belief_id_1)
      const b2 = beliefMap.get(rel.belief_id_2)
      if (!b1 || !b2) return null
      return {
        id: rel.id,
        belief_1: b1,
        belief_2: b2,
        strength_score: rel.strength_score,
        explanation: rel.explanation,
        created_at: rel.created_at,
      }
    })
    .filter(Boolean)

  return NextResponse.json({ contradictions })
}