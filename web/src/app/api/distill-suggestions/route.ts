import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { getSuggestionsDistillPrompt } from '@/lib/prompts'
import { STOP_WORDS } from '@/lib/stopWords'

const COOLDOWN_HOURS = 24
const MIN_EVENTS = 5

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { context_id, context_path } = await req.json() as {
    context_id: string
    context_path: string[]
  }

  // Verify context exists (system or user-owned)
  const { data: ctx } = await supabase
    .from('contexts')
    .select('id, user_id')
    .eq('id', context_id)
    .single()

  if (!ctx) {
    return NextResponse.json({ error: 'Context not found' }, { status: 404 })
  }

  // Check access: must be system context or owned by user
  if (ctx.user_id !== null && ctx.user_id !== user.id) {
    return NextResponse.json({ error: 'Context not accessible' }, { status: 403 })
  }

  // Cooldown gate: check user_context_meta
  const { data: meta } = await supabase
    .from('user_context_meta')
    .select('last_distilled_at')
    .eq('user_id', user.id)
    .eq('context_id', context_id)
    .single()

  if (meta?.last_distilled_at) {
    const lastRun = new Date(meta.last_distilled_at).getTime()
    const cutoff = Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000
    if (lastRun > cutoff) {
      return NextResponse.json({ skipped: 'cooldown' })
    }
  }

  // Count usage_events for this context since last_distilled_at
  let countQuery = supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .contains('context_path', context_path)

  if (meta?.last_distilled_at) {
    countQuery = countQuery.gt('created_at', meta.last_distilled_at)
  }

  const { count } = await countQuery
  if ((count ?? 0) < MIN_EVENTS) {
    return NextResponse.json({ skipped: 'insufficient_data' })
  }

  // Fetch source data
  const [eventsResult, logsResult] = await Promise.all([
    supabase
      .from('usage_events')
      .select('phrase_spoken, selected_topics')
      .eq('user_id', user.id)
      .contains('context_path', context_path)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('conversation_log')
      .select('messages')
      .eq('user_id', user.id)
      .contains('context_path', context_path)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const events = eventsResult.data || []
  const logs = logsResult.data || []

  // Keyword mining via frequency
  const freq: Record<string, number> = {}
  const addTokens = (text: string) => {
    text
      .toLowerCase()
      .split(/[\s,\.!?;:'"()\-]+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  }

  for (const e of events) {
    for (const w of (e.selected_topics || [])) {
      const lower = (w as string).toLowerCase()
      if (!STOP_WORDS.has(lower)) freq[lower] = (freq[lower] || 0) + 2
    }
    if (e.phrase_spoken) addTokens(e.phrase_spoken)
  }
  for (const log of logs) {
    for (const m of (log.messages as { role: string; text: string }[])) {
      if (m.role === 'user') addTokens(m.text)
    }
  }

  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w)

  // Collect recent user-spoken phrases for LLM
  const recentPhrases: string[] = []
  for (const log of logs) {
    for (const m of (log.messages as { role: string; text: string }[])) {
      if (m.role === 'user' && m.text) recentPhrases.push(m.text)
      if (recentPhrases.length >= 20) break
    }
    if (recentPhrases.length >= 20) break
  }

  // LLM sentence generation
  let sentences: string[] = []
  if (recentPhrases.length > 0) {
    try {
      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({ sentences: z.array(z.string()).max(5) }),
        prompt: getSuggestionsDistillPrompt(recentPhrases, context_path),
        temperature: 0.3,
      })
      sentences = result.object.sentences
    } catch (err) {
      console.error('Sentence generation failed:', err)
    }
  }

  // Write to DB: delete old user-owned suggestions for this context, insert new ones
  await supabase
    .from('suggestions')
    .delete()
    .eq('context_id', context_id)
    .eq('user_id', user.id)

  const inserts = [
    ...topKeywords.map(text => ({ context_id, type: 'keyword' as const, text, user_id: user.id })),
    ...sentences.map(text => ({ context_id, type: 'sentence' as const, text, user_id: user.id })),
  ]

  if (inserts.length > 0) {
    await supabase.from('suggestions').insert(inserts)
  }

  // Update user_context_meta (upsert)
  await supabase
    .from('user_context_meta')
    .upsert(
      { user_id: user.id, context_id, last_distilled_at: new Date().toISOString() },
      { onConflict: 'user_id,context_id' }
    )

  return NextResponse.json({ keywords: topKeywords, sentences })
}
