import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getCoreInstructions, getStateDescription } from "@/lib/prompts";
import { createClient } from "@/utils/supabase/server";
import { STOP_WORDS } from "@/lib/stopWords";

// Ensure Edge runtime isn't strictly required if relying on Node APIs, but standard Next.js handles this
export const maxDuration = 60; 

const responseSchema = z.object({
  statementWords: z.array(z.object({ word: z.string(), theme: z.string() })).optional(),
  questionWords: z.array(z.object({ word: z.string(), theme: z.string() })).optional(),
  statementResponses: z.array(z.object({ id: z.number().optional(), title: z.string(), body: z.string(), color: z.string() })).optional(),
  questionResponses: z.array(z.object({ id: z.number().optional(), title: z.string(), body: z.string(), color: z.string() })).optional(),
  quickReplies: z.array(z.string()).optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      transcript,
      chatHistory = [],
      isQuestion,
      context,
      selectedWords = [],
      requestedWordCount = 10,
      model = "openai",
      interlocutor_id = null
    } = body;

    if (typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "Transcript must be a string" }), { status: 400 });
    }

    // --- PROMPT ASSEMBLY ---
    const coreInstructions = getCoreInstructions(requestedWordCount);
    const isInitiativeMode = transcript.trim() === "";

    const contextContext = context && context.length > 0 ? `Context: ${context.join(", ")}` : "No specific context.";
    const selectedWordsContext = selectedWords && selectedWords.length > 0
      ? `\nUser Selected Words (MUST INCLUDE ALL): [${selectedWords.join(", ")}]`
      : "";

    let historyPrompt = "";
    if (chatHistory && chatHistory.length > 0) {
      historyPrompt = `\nHistory:\n${chatHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.text}`).join('\n')}\n`;
    }

    const stateDesc = getStateDescription({
      isInitiativeMode,
      historyPrompt,
      transcript
    });

    // Fetch persona context
    let personaContext = '';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: persona } = await supabase
          .from('user_personas')
          .select('profile_md, learned_md')
          .eq('user_id', user.id)
          .single();
        
        if (persona) {
          const parts: string[] = [];
          if (persona.profile_md?.trim()) parts.push(`## About the User\n${persona.profile_md}`);
          if (persona.learned_md?.trim()) parts.push(`## Learned Preferences\n${persona.learned_md}`);
          if (parts.length > 0) personaContext = `\n--- USER PERSONA ---\n${parts.join('\n\n')}\n`;
        }
        
        if (interlocutor_id) {
          const { data: interlocutor } = await supabase
            .from('interlocutors')
            .select('name, relationship, profile_md, learned_md')
            .eq('id', interlocutor_id)
            .eq('user_id', user.id)
            .single();

          if (interlocutor) {
             const parts: string[] = [];
             parts.push(`You are currently speaking to: ${interlocutor.name} ${interlocutor.relationship ? `(${interlocutor.relationship})` : ''}`);
             if (interlocutor.profile_md?.trim()) parts.push(`## About Them\n${interlocutor.profile_md}`);

             // Inject last session from conversation_log
             const { data: latest } = await supabase
               .from('conversation_log')
               .select('created_at')
               .eq('user_id', user.id)
               .eq('interlocutor_id', interlocutor_id)
               .order('created_at', { ascending: false })
               .limit(1)
               .single();

             if (latest) {
               const windowStart = new Date(
                 new Date(latest.created_at).getTime() - 60 * 60 * 1000
               ).toISOString();
               const { data: sessionRows } = await supabase
                 .from('conversation_log')
                 .select('messages, context_path, created_at')
                 .eq('user_id', user.id)
                 .eq('interlocutor_id', interlocutor_id)
                 .gte('created_at', windowStart)
                 .order('created_at', { ascending: true });

               if (sessionRows && sessionRows.length > 0) {
                 const sessionDate = new Date(latest.created_at).toLocaleDateString();
                 const allMessages = sessionRows.flatMap((r: any) => r.messages as { role: string; text: string }[]);
                 const formatted = allMessages
                   .map(m => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.text}`)
                   .join('\n');
                 parts.push(`## Last Conversation (${sessionDate})\n${formatted}`);
               }
             }

             if (interlocutor.learned_md?.trim()) parts.push(`## Learned Interaction Habits\n${interlocutor.learned_md}`);
             personaContext += `\n--- INTERLOCUTOR CONTEXT ---\n${parts.join('\n\n')}\n`;
          }
        }

        // Context-specific vocabulary from usage history
        if (context && context.length > 0) {
          const { data: events } = await supabase
            .from('usage_events')
            .select('selected_topics, phrase_spoken')
            .eq('user_id', user.id)
            .contains('context_path', context)
            .order('created_at', { ascending: false })
            .limit(100);

          const { data: logs } = await supabase
            .from('conversation_log')
            .select('messages')
            .eq('user_id', user.id)
            .contains('context_path', context)
            .order('created_at', { ascending: false })
            .limit(50);

          const freq: Record<string, number> = {};
          const addTokens = (text: string) => {
            text.toLowerCase()
              .split(/[\s,\.!?;:'"()\-]+/)
              .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
              .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
          };

          for (const e of events || []) {
            for (const w of (e.selected_topics || [])) {
              const lower = (w as string).toLowerCase();
              if (!STOP_WORDS.has(lower)) freq[lower] = (freq[lower] || 0) + 2;
            }
            if (e.phrase_spoken) addTokens(e.phrase_spoken);
          }
          for (const log of logs || []) {
            for (const m of (log.messages as { role: string; text: string }[] || [])) {
              if (m.role === 'user') addTokens(m.text);
            }
          }

          const topWords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([w]) => w);

          if (topWords.length > 0) {
            personaContext += `\n## Vocabulary Observed in This Context\n(Prefer these words in suggestions): ${topWords.join(', ')}\n`;
          }
        }
      }
    } catch (e) {
      // Non-fatal
    }

    const fullPrompt = `${coreInstructions}
${personaContext}
--- CURRENT STATE ---
${contextContext}
${stateDesc}
${selectedWordsContext}`;

    // --- MODEL SELECTION ---
    let aiModel;
    if (model === "google") {
      aiModel = google("gemini-2.5-flash");
    } else if (model === "anthropic") {
      // Fallback to latest haiku if custom string fails, but trying user's string first
      aiModel = anthropic("claude-3-5-haiku-latest"); // standard naming
    } else {
      aiModel = openai("gpt-4o-mini"); // gpt-5-mini doesn't exist natively in the SDK mapping yet, defaulting to 4o-mini for safety
    }

    // --- STREAMING OBJECT ---
    const result = await streamObject({
      model: aiModel,
      schema: responseSchema,
      system: "You are the predictive Brain of an AAC app. You MUST strictly adhere to the requested JSON schema. Do not generate arrays larger than requested.",
      prompt: fullPrompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("API /predict error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate prediction" }), { status: 500 });
  }
}
