import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { getWordCloudInstructions } from "@/lib/prompts";

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

        const coreInstructions = getWordCloudInstructions(requestedWordCount, isQuestion);

        const contextContext = context && context.length > 0 ? `Context: ${context.join(", ")}` : "No specific context.";
        const selectedWordsContext = selectedWords && selectedWords.length > 0
            ? `\nUser Selected Words (MUST INCLUDE ALL): [${selectedWords.join(", ")}]`
            : "";

        let historyPrompt = "";
        if (chatHistory && chatHistory.length > 0) {
            historyPrompt = `\nHistory:\n${chatHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.text}`).join('\n')}\n`;
        }

        const stateDesc = `Partner's latest: "${transcript}"\n${historyPrompt}`;

        const fullPrompt = `${coreInstructions}\n\n--- CURRENT STATE ---\n${contextContext}\n${stateDesc}\n${selectedWordsContext}\n\nJSON OUTPUT:`;

        let resultText = '{"words": []}';

        if (model === "google") {
            const gResponse = await googleAi.models.generateContent({
                model: "gemini-2.5-flash",
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
                max_tokens: 1000,
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
                // @ts-ignore
                reasoning_effort: "minimal"
            });
            resultText = oResponse.choices[0]?.message?.content || resultText;
        }

        return NextResponse.json(JSON.parse(resultText));

    } catch (error: any) {
        console.error("API /predict-words error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate fast words" }, { status: 500 });
    }
}
