import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DISTILL_PROMPT = `You are analyzing conversation logs for an AAC (Augmentative and Alternative Communication) user.
Given the following recent conversations and existing learned profile, extract NEW insights about the user's:
- Communication preferences and patterns
- Frequently discussed topics
- Relationship dynamics mentioned
- Vocabulary habits and favourite phrases
- Daily routine observations
- Emotional patterns or mood indicators
- Things they care about or find important

Existing learned profile:
{learned_md}

Recent conversations:
{conversation_logs}

Output an updated Markdown profile preserving existing valid insights and adding new ones.
Remove anything contradicted by recent evidence.
Use clear section headers and bullet points.
Write in third person (e.g. "John prefers..." not "You prefer...").`

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch current learned_md
  const { data: persona } = await supabase
    .from('user_personas')
    .select('learned_md')
    .eq('user_id', user.id)
    .single()

  const existingLearned = persona?.learned_md || '(No existing profile yet)'

  // 2. Fetch recent conversation logs (last 50 sessions)
  const { data: logs } = await supabase
    .from('conversation_log')
    .select('messages, context_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!logs || logs.length === 0) {
    return NextResponse.json({ message: 'No conversations to distill yet' })
  }

  // 3. Format conversation logs for the prompt
  const formattedLogs = logs.map((log, i) => {
    const contextStr = (log.context_path || []).join(' → ')
    const messagesStr = (log.messages as any[])
      .map((m: any) => `  [${m.role}]: ${m.text}`)
      .join('\n')
    return `### Session ${i + 1} (${log.created_at})${contextStr ? ` — Context: ${contextStr}` : ''}\n${messagesStr}`
  }).join('\n\n')

  // 4. Build the distillation prompt
  const prompt = DISTILL_PROMPT
    .replace('{learned_md}', existingLearned)
    .replace('{conversation_logs}', formattedLogs)

  // 5. Call the LLM
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const newLearnedMd = completion.choices[0]?.message?.content || existingLearned

    // 6. Save the updated learned_md
    const { error: updateError } = await supabase
      .from('user_personas')
      .upsert({
        user_id: user.id,
        learned_md: newLearnedMd,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      learned_md: newLearnedMd,
      sessions_analyzed: logs.length
    })
  } catch (err: any) {
    console.error('Distillation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
