import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// DELETE /api/beliefs/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  // Verify ownership
  const { data: belief } = await supabase
    .from('beliefs')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!belief) {
    return NextResponse.json({ error: 'Belief not found' }, { status: 404 })
  }

  if (belief.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete related belief_relations first (cascade should handle this, but belt-and-suspenders)
  await supabase
    .from('belief_relations')
    .delete()
    .or(`belief_id_1.eq.${id},belief_id_2.eq.${id}`)

  // Delete the belief
  const { error } = await supabase
    .from('beliefs')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, id })
}
