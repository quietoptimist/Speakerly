import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to fetch existing persona
  const { data, error } = await supabase
    .from('user_personas')
    .select('profile_md, learned_md, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    // No row exists yet — return empty defaults
    return NextResponse.json({ profile_md: '', learned_md: '', updated_at: null })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_md, learned_md } = body

  // Upsert: create if not exists, update if it does
  const { error } = await supabase
    .from('user_personas')
    .upsert({
      user_id: user.id,
      profile_md: profile_md ?? undefined,
      learned_md: learned_md ?? undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
