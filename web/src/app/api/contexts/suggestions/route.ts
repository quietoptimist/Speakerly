import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient, isAdmin } from '@/utils/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const contextId = searchParams.get('context_id')
  if (!contextId) {
    return NextResponse.json({ error: 'context_id is required' }, { status: 400 })
  }

  // Fetch user's suggestion dismissals
  const { data: suggDismissals } = await supabase
    .from('user_suggestion_dismissals')
    .select('suggestion_id')
    .eq('user_id', user.id)

  const dismissedIds = new Set((suggDismissals || []).map(d => d.suggestion_id))

  // Fetch system + user's own suggestions for this context
  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('context_id', contextId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Annotate each suggestion with whether the user has dismissed it
  const annotated = (suggestions || []).map(s => ({
    ...s,
    dismissed: dismissedIds.has(s.id)
  }))

  return NextResponse.json(annotated)
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { context_id, type, text } = body

  if (!context_id || !type || !text) {
    return NextResponse.json({ error: 'context_id, type, and text are required' }, { status: 400 })
  }

  const admin = isAdmin(user.email)
  const client = admin ? createAdminClient() : supabase

  const { data, error } = await client
    .from('suggestions')
    .insert({ context_id, type, text, user_id: admin ? null : user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, text } = body

  if (!id || !text) {
    return NextResponse.json({ error: 'id and text are required' }, { status: 400 })
  }

  const admin = isAdmin(user.email)

  if (admin) {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('suggestions')
      .update({ text })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('suggestions')
    .update({ text })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Fetch suggestion to check ownership
  const { data: suggestion } = await supabase
    .from('suggestions')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  const admin = isAdmin(user.email)

  if (suggestion.user_id === null) {
    if (admin) {
      const adminClient = createAdminClient()
      const { error } = await adminClient.from('suggestions').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // Soft dismiss
      const { error } = await supabase
        .from('user_suggestion_dismissals')
        .upsert({ user_id: user.id, suggestion_id: id }, { onConflict: 'user_id,suggestion_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (suggestion.user_id === user.id) {
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
