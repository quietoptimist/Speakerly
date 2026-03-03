import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transcript, grid1, grid2, context } = body;

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        // Map grid coordinates to prompt descriptions
        // grid1: x = brevity (0-4), y = seriousness (0-4)
        const brevityDescriptions = ["extremely short, brief, 1-2 words", "short and concise", "normal sentence length", "detailed and descriptive", "very long and elaborate"];
        const seriousnessDescriptions = ["extremely funny and joking", "lighthearted and playful", "neutral and conversational", "serious and focused", "extremely serious and professional"];

        // grid2: x = stance (0-4), y = understanding (0-4)
        const stanceDescriptions = ["strongly disagreeing or pushing back", "disagreeing lightly or offering an alternative", "neutral or inquiring", "agreeing and supportive", "strongly agreeing and enthusiastic"];
        const understandingDescriptions = ["completely confused, needs clarification", "unsure or asking questions", "following along neutrally", "understands the point", "completely understands and validates"];

        const brevityDesc = brevityDescriptions[grid1?.x ?? 2];
        const toneDesc = seriousnessDescriptions[grid1?.y ?? 2];
        const stanceDesc = stanceDescriptions[grid2?.x ?? 2];
        const understandingDesc = understandingDescriptions[grid2?.y ?? 2];

        const contextContext = context && context.length > 0 ? `Current Context: ${context.join(", ")}` : "No specific context.";

        const systemPrompt = `You are the predictive "Brain" of an AAC (Augmentative and Alternative Communication) app.
Your user cannot speak. You must generate 4 perfect, full-sentence options for them to say in reply to their conversation partner.

Listen to the partner's transcript, and look at the User's current Intention settings.

Partner says: "${transcript}"

User's Intentions:
- Attitude/Tone: ${toneDesc}
- Length/Brevity: ${brevityDesc}
- Understanding of partner: ${understandingDesc}
- Stance/Agreement: ${stanceDesc}
- ${contextContext}

CRITICAL RULES:
1. Generate exactly 4 distinct options.
2. The options MUST perfectly align with the User's Intentions (Tone and Stance). If the stance is "disagreeing", provide 4 polite but firm ways to disagree.
3. Output MUST be valid JSON matching this exact schema:
{
  "responses": [
    {
      "id": 1,
      "title": "1-3 word highly scannable summary/keyword",
      "body": "The exact full sentence the TTS engine will speak. Make it sound natural and human.",
      "color": "cyan" // Choose from: "cyan" (good for neutral/requests), "emerald" (good for agreeing/positive), "purple" (good for questions/funny), "slate" (good for disagreeing/serious)
    }
  ]
}

Ensure the JSON is perfectly formatted.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt }
            ],
            temperature: 0.7,
        });

        const resultText = response.choices[0]?.message?.content || '{"responses": []}';
        return NextResponse.json(JSON.parse(resultText));

    } catch (error: any) {
        console.error("API /predict error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate prediction" }, { status: 500 });
    }
}
