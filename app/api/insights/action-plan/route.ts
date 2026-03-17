import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateActionPlan } from '@/lib/ai'
import type { AIInsight } from '@/lib/types'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: beliefs }, { data: insights }] = await Promise.all([
    supabase.from('beliefs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  try {
    const plan = await generateActionPlan(beliefs || [], (insights as AIInsight[]) || [])
    return NextResponse.json({ plan })
  } catch (e) {
    console.error('Action plan generation failed:', e)
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 500 })
  }
}
