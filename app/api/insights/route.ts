import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateInsights } from '@/lib/ai'

// GET /api/insights — list all insights for the current user
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: insights, error } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ insights })
}

// POST /api/insights — run AI analysis on all beliefs and save new insights
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all beliefs
  const { data: beliefs, error: beliefsError } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (beliefsError) {
    return NextResponse.json({ error: beliefsError.message }, { status: 500 })
  }

  if (!beliefs || beliefs.length < 3) {
    return NextResponse.json({
      error: 'Add at least 3 beliefs before running analysis.',
      insights: [],
    }, { status: 422 })
  }

  // Fetch relations
  const { data: relations } = await supabase
    .from('belief_relations')
    .select('relation_type, strength_score, explanation, belief_id_1, belief_id_2')
    .in('belief_id_1', beliefs.map((b) => b.id))

  // Run AI analysis
  let aiInsights
  try {
    aiInsights = await generateInsights(beliefs, relations || [])
  } catch (e) {
    console.error('Insight generation failed:', e)
    return NextResponse.json({ error: 'AI analysis failed.' }, { status: 500 })
  }

  if (!aiInsights || aiInsights.length === 0) {
    return NextResponse.json({ insights: [], message: 'No insights generated.' })
  }

  // Clear old insights before inserting new ones
  await supabase.from('insights').delete().eq('user_id', user.id)

  // Save new insights
  const insightsToSave = aiInsights.map((ins) => ({
    user_id: user.id,
    type: ins.type,
    description: ins.description,
    severity: ins.severity,
    related_belief_ids: ins.related_belief_ids || [],
    is_read: false,
  }))

  const { data: savedInsights, error: saveError } = await supabase
    .from('insights')
    .insert(insightsToSave)
    .select()

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

  return NextResponse.json({ insights: savedInsights, count: savedInsights?.length || 0 })
}

// PATCH /api/insights?id=... — mark an insight as read
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('insights')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: true })
}
