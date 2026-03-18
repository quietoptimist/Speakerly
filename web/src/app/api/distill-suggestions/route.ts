import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { copyDefaultsForUser } from '@/lib/contextUtils'
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

  let { context_id, context_path } = await req.json() as {
    context_id: string
    context_path: string[]
  }

  // Fetch context row
  let { data: ctx } = await supabase
    .from('contexts')
    .select('id, user_id, last_distilled_at')
    .eq('id', context_id)
    .single()

  if (!ctx) {
    return NextResponse.json({ error: 'Context not found' }, { status: 404 })
  }

  // If this is a system default context (user_id IS NULL), clone it first
  if (ctx.user_id === null) {
    try {
      const idMap = await copyDefaultsForUser(supabase, user.id)
      // Find the equivalent user-owned leaf by matching name in the path
      // The last segment of context_path is the leaf node name
      const leafName = context_path[context_path.length - 1]
      const { data: newLeaf } = await supabase
        .from('contexts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', leafName)
        .single()

      if (newLeaf) {
        context_id = newLeaf.id
      } else {
        // Fall back: look up via idMap
        const mappedId = idMap.get(context_id)
        if (mappedId) context_id = mappedId
      }

      // Re-fetch the context row with the new id
      const { data: newCtx } = await supabase
        .from('contexts')
        .select('id, user_id, last_distilled_at')
        .eq('id', context_id)
        .single()
      ctx = newCtx
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // Verify it now belongs to the user
  if (!ctx || ctx.user_id !== user.id) {
    return NextResponse.json({ error: 'Context not accessible' }, { status: 403 })
  }

  // Cooldown gate
  if (ctx.last_distilled_at) {
    const lastRun = new Date(ctx.last_distilled_at).getTime()
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

  if (ctx.last_distilled_at) {
    countQuery = countQuery.gt('created_at', ctx.last_distilled_at)
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

  // Write to DB: delete old suggestions, insert new ones, update last_distilled_at
  await supabase.from('suggestions').delete().eq('context_id', context_id)

  const inserts = [
    ...topKeywords.map(text => ({ context_id, type: 'keyword' as const, text })),
    ...sentences.map(text => ({ context_id, type: 'sentence' as const, text })),
  ]

  if (inserts.length > 0) {
    await supabase.from('suggestions').insert(inserts)
  }

  await supabase
    .from('contexts')
    .update({ last_distilled_at: new Date().toISOString() })
    .eq('id', context_id)

  return NextResponse.json({ keywords: topKeywords, sentences })
}
