import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST: Save a conversation session and/or usage events
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messages, context_path, usage_event, interlocutor_id } = body

  // If we're archiving a full conversation session
  if (messages && messages.length > 0) {
    const { error } = await supabase
      .from('conversation_log')
      .insert({
        user_id: user.id,
        messages,
        context_path: context_path || [],
        interlocutor_id: interlocutor_id || null
      })

    if (error) {
      console.error('Failed to archive conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // If we're logging a single usage event
  if (usage_event) {
    const { error } = await supabase
      .from('usage_events')
      .insert({
        user_id: user.id,
        role: usage_event.role || 'user',
        context_path: usage_event.context_path || [],
        selected_topics: usage_event.selected_topics || [],
        phrase_spoken: usage_event.phrase_spoken,
        phrase_type: usage_event.phrase_type || 'statement',
        interlocutor_id: usage_event.interlocutor_id || interlocutor_id || null
      })

    if (error) {
      console.error('Failed to log usage event:', error)
      // Non-fatal — don't block the UI
    }
  }

  return NextResponse.json({ success: true })
}

// GET: Retrieve recent conversation logs for the distillation UI or job
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  const { data, error } = await supabase
    .from('conversation_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data })
}
