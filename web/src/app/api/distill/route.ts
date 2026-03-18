import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { getUserDistillPrompt, getInterlocutorDistillPrompt } from '@/lib/prompts'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse optional interlocutor_id
  let interlocutorId: string | null = null;
  let interlocutorName: string | undefined = undefined;
  try {
     const body = await req.json();
     interlocutorId = body.interlocutor_id || null;
  } catch {
     // Ignore missing body
  }

  let existingLearned = '(No existing profile yet)';
  let lastDistilledAt: string | null = null;

  if (interlocutorId) {
    const { data: interlocutor } = await supabase
        .from('interlocutors')
        .select('name, learned_md, last_distilled_at')
        .eq('id', interlocutorId)
        .eq('user_id', user.id)
        .single()
    existingLearned = interlocutor?.learned_md || existingLearned;
    interlocutorName = interlocutor?.name;
    lastDistilledAt = interlocutor?.last_distilled_at || null;
  } else {
    const { data: persona } = await supabase
      .from('user_personas')
      .select('learned_md, last_distilled_at')
      .eq('user_id', user.id)
      .single()
    existingLearned = persona?.learned_md || existingLearned;
    lastDistilledAt = persona?.last_distilled_at || null;
  }

  // Fetch only conversation logs created after last distillation
  let query = supabase
    .from('conversation_log')
    .select('messages, context_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (lastDistilledAt) {
    query = query.gt('created_at', lastDistilledAt);
  }

  if (interlocutorId) {
     query = query.eq('interlocutor_id', interlocutorId);
  }

  const { data: logs } = await query;

  if (!logs || logs.length === 0) {
    return NextResponse.json({ message: 'Nothing new to distill' })
  }

  // Format conversation logs for the prompt
  const formattedLogs = logs.map((log, i) => {
    const contextStr = (log.context_path || []).join(' → ')
    const messagesStr = (log.messages as { role: string; text: string }[])
      .map((m) => `  [${m.role}]: ${m.text}`)
      .join('\n')
    return `### Session ${i + 1} (${log.created_at})${contextStr ? ` — Context: ${contextStr}` : ''}\n${messagesStr}`
  }).join('\n\n')

  // Build context summary for interlocutor distillation
  let contextSummary: string | undefined = undefined;
  if (interlocutorId) {
    const { data: ctxData } = await supabase
      .from('conversation_log')
      .select('context_path')
      .eq('user_id', user.id)
      .eq('interlocutor_id', interlocutorId)
      .not('context_path', 'is', null);

    const ctxFreq: Record<string, number> = {};
    for (const row of ctxData || []) {
      const key = (row.context_path || []).join(' > ');
      if (key) ctxFreq[key] = (ctxFreq[key] || 0) + 1;
    }
    const top = Object.entries(ctxFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k} (${v} sessions)`)
      .join(', ');
    if (top) contextSummary = `Most frequent contexts: ${top}`;
  }

  // Build the distillation prompt
  const prompt = interlocutorId && interlocutorName
    ? getInterlocutorDistillPrompt(existingLearned, formattedLogs, interlocutorName, contextSummary)
    : getUserDistillPrompt(existingLearned, formattedLogs)

  // Call the LLM
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
    const now = new Date().toISOString();

    // Save the updated learned_md and last_distilled_at
    if (interlocutorId) {
        const { error: updateError } = await supabase
            .from('interlocutors')
            .update({
                learned_md: newLearnedMd,
                last_distilled_at: now,
                updated_at: now
            })
            .eq('id', interlocutorId)
            .eq('user_id', user.id);

        if (updateError) throw updateError;
    } else {
        const { error: updateError } = await supabase
          .from('user_personas')
          .upsert({
            user_id: user.id,
            learned_md: newLearnedMd,
            last_distilled_at: now,
            updated_at: now
          }, { onConflict: 'user_id' })

        if (updateError) throw updateError;
    }

    return NextResponse.json({
      success: true,
      learned_md: newLearnedMd,
      sessions_analyzed: logs.length
    })
  } catch (err: unknown) {
    console.error('Distillation failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
