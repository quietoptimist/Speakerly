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
  } catch (e) {
     // Ignore missing body
  }

  let existingLearned = '(No existing profile yet)';
  
  if (interlocutorId) {
    const { data: interlocutor } = await supabase
        .from('interlocutors')
        .select('name, learned_md')
        .eq('id', interlocutorId)
        .eq('user_id', user.id)
        .single()
    existingLearned = interlocutor?.learned_md || existingLearned;
    interlocutorName = interlocutor?.name;
  } else {
    // 1. Fetch current user learned_md
    const { data: persona } = await supabase
      .from('user_personas')
      .select('learned_md')
      .eq('user_id', user.id)
      .single()
    existingLearned = persona?.learned_md || existingLearned;
  }

  // 2. Fetch recent conversation logs
  let query = supabase
    .from('conversation_log')
    .select('messages, context_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (interlocutorId) {
     query = query.eq('interlocutor_id', interlocutorId);
  } else {
     // If distilling the main user, we can either look at all logs, 
     // or just logs where interlocutor_id is null. Let's look at all logs for a holistic user view.
  }

  const { data: logs } = await query;

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
  const prompt = interlocutorId && interlocutorName
    ? getInterlocutorDistillPrompt(existingLearned, formattedLogs, interlocutorName)
    : getUserDistillPrompt(existingLearned, formattedLogs)

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
    if (interlocutorId) {
        const { error: updateError } = await supabase
            .from('interlocutors')
            .update({
                learned_md: newLearnedMd,
                updated_at: new Date().toISOString()
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
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          
        if (updateError) throw updateError;
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
