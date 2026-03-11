import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { getCoreInstructions, getStateDescription } from "@/lib/prompts";
import { createClient } from "@/utils/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "YOUR_GOOGLE_KEY" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_KEY" });

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
      return NextResponse.json({ error: "Transcript must be a string" }, { status: 400 });
    }

    // --- IMPORTED PROMPT CORE ---
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
    // Fetch persona context if available
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
      // Non-fatal — continue without persona
    }

    const fullPrompt = `${coreInstructions}
${personaContext}
--- CURRENT STATE ---
${contextContext}
${stateDesc}
${selectedWordsContext}

JSON OUTPUT:`;

    let resultText = '{"statementResponses": [], "questionResponses": []}';

    if (model === "google") {
      const gResponse = await googleAi.models.generateContent({
        model: "gemini-2.5-flash", // Reverted to 2.5 Flash as 3.1 may not be publicly available yet
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });
      resultText = gResponse.text || resultText;
    } else if (model === "anthropic") {
      const aResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        temperature: 0.7,
        system: "You are the predictive Brain of an AAC app. Output ONLY valid JSON.",
        messages: [{ role: "user", content: fullPrompt }]
      });
      if (aResponse.content[0].type === "text") {
        let text = aResponse.content[0].text.trim();
        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length - 3);
        resultText = text.trim();
      }
    } else {
      // openai
      const oResponse = await openai.chat.completions.create({
        model: "gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: fullPrompt }],
        // @ts-ignore - reasoning_effort is a new param
        reasoning_effort: "minimal"
      });
      resultText = oResponse.choices[0]?.message?.content || resultText;
    }

    return NextResponse.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error("API /predict error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate prediction" }, { status: 500 });
  }
}
