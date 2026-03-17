import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/contradictions — returns contradiction relations
// ?full=true returns belief details joined
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const full = searchParams.get('full') === 'true'

  if (!full) {
    // Lightweight: just IDs and scores (for graph)
    const { data: beliefs } = await supabase
      .from('beliefs')
      .select('id')
      .eq('user_id', user.id)

    if (!beliefs || beliefs.length === 0) {
      return NextResponse.json({ relations: [] })
    }

    const beliefIds = beliefs.map((b) => b.id)

    const { data: relations, error } = await supabase
      .from('belief_relations')
      .select('*')
      .in('belief_id_1', beliefIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ relations: relations || [] })
  }

  // Full mode: join belief content for the contradictions page
  const { data: beliefs } = await supabase
    .from('beliefs')
    .select('id, content, category, created_at')
    .eq('user_id', user.id)

  if (!beliefs || beliefs.length === 0) {
    return NextResponse.json({ contradictions: [] })
  }

  const beliefIds = beliefs.map((b) => b.id)
  const beliefMap = new Map(beliefs.map((b) => [b.id, b]))

  const { data: relations, error } = await supabase
    .from('belief_relations')
    .select('*')
    .in('belief_id_1', beliefIds)
    .eq('relation_type', 'contradicts')
    .order('strength_score', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const contradictions = (relations || [])
    .map((rel) => {
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
