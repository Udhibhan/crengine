import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createDialogueStream } from '@/lib/ai'
import type { ChatMessage } from '@/lib/types'

export const maxDuration = 60 // Allow up to 60s for streaming

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, history } = (await req.json()) as {
    message: string
    history: ChatMessage[]
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  // Fetch user's beliefs for context
  const { data: beliefs } = await supabase
    .from('beliefs')
    .select('id, content, category, confidence_score, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40)

  let stream: ReadableStream<Uint8Array>

  try {
    stream = await createDialogueStream(
      message.trim(),
      history || [],
      beliefs || []
    )
  } catch (e) {
    console.error('Dialogue stream failed:', e)
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 500 })
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
