import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  // Verify ownership first
  const { data: belief } = await supabase
    .from('beliefs')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!belief) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (belief.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete relations first (cascade may not be set up)
  await supabase
    .from('belief_relations')
    .delete()
    .or(`belief_id_1.eq.${id},belief_id_2.eq.${id}`)

  // Delete the belief
  const { error } = await supabase
    .from('beliefs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true, id })
}