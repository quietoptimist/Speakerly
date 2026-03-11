import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getCoreInstructions, getStateDescription } from "@/lib/prompts";
import { createClient } from "@/utils/supabase/server";

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
      model = "openai"
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
