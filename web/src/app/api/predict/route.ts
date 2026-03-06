import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { getCoreInstructions, getStateDescription } from "@/lib/prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "YOUR_GOOGLE_KEY" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_KEY" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      transcript,
      chatHistory = [],
      grid1,
      grid2,
      grid3,
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

    // Map grid coordinates to prompt descriptions
    const brevityDescriptions = ["extremely short, brief", "short and concise", "normal length", "detailed", "elaborate"];
    const seriousnessDescriptions = ["funny/joking", "playful", "neutral", "serious", "professional"];
    const stanceDescriptions = ["strongly disagreeing", "lightly disagreeing", "neutral", "agreeing", "strongly agreeing"];
    const understandingDescriptions = ["confused", "unsure", "following", "understands main points", "understands perfectly"];
    const timeDescriptions = ["distant past", "recent past", "present moment", "near future", "distant future"];
    const urgencyDescriptions = ["relaxed", "casual", "normal", "important", "emergency"];

    const brevityDesc = brevityDescriptions[grid1?.x ?? 2];
    const toneDesc = seriousnessDescriptions[grid1?.y ?? 2];
    const stanceDesc = stanceDescriptions[grid2?.x ?? 2];
    const understandingDesc = understandingDescriptions[grid2?.y ?? 2];
    const timeDesc = timeDescriptions[grid3?.x ?? 2];
    const urgencyDesc = urgencyDescriptions[grid3?.y ?? 2];

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
      transcript,
      toneDesc,
      brevityDesc,
      stanceDesc,
      understandingDesc,
      timeDesc,
      urgencyDesc
    });

    const fullPrompt = `${coreInstructions}

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
