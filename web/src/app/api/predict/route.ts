import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "YOUR_GOOGLE_KEY" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, chatHistory = [], grid1, grid2, grid3, isQuestion, context, selectedWords = [], requestedWordCount = 10, model = "openai" } = body;

    if (typeof transcript !== "string") {
      return NextResponse.json({ error: "Transcript must be a string" }, { status: 400 });
    }

    const isInitiativeMode = transcript.trim() === "";

    // Map grid coordinates to prompt descriptions
    // grid1: x = brevity (0-4), y = seriousness (0-4)
    const brevityDescriptions = ["extremely short, brief, 1-2 words", "short and concise", "normal sentence length", "detailed and descriptive", "very long and elaborate"];
    const seriousnessDescriptions = ["extremely funny and joking", "lighthearted and playful", "neutral and conversational", "serious and focused", "extremely serious and professional"];

    // grid2: x = stance (0-4), y = understanding (0-4)
    const stanceDescriptions = ["strongly disagreeing or pushing back", "disagreeing lightly or offering an alternative", "neutral or inquiring", "agreeing and supportive", "strongly agreeing and enthusiastic"];
    const understandingDescriptions = [
      "completely confused, needs clarification",
      "somewhat confused, unsure",
      "neutral, following along",
      "mostly clear, understands the main points",
      "completely clear on the topic, understands perfectly"
    ];

    // grid3: x = time (0-4), y = urgency (0-4)
    const timeDescriptions = ["referring to the distant past", "referring to the recent past", "referring to the present moment", "referring to the near future", "referring to the distant future"];
    const urgencyDescriptions = ["completely relaxed, no rush", "casual, whenever", "normal importance", "important, somewhat urgent", "extremely urgent, emergency"];

    const brevityDesc = brevityDescriptions[grid1?.x ?? 2];
    const toneDesc = seriousnessDescriptions[grid1?.y ?? 2];
    const stanceDesc = stanceDescriptions[grid2?.x ?? 2];
    const understandingDesc = understandingDescriptions[grid2?.y ?? 2];
    const timeDesc = timeDescriptions[grid3?.x ?? 2];
    const urgencyDesc = urgencyDescriptions[grid3?.y ?? 2];
    const sentenceTypeDesc = isQuestion ? "ASK A QUESTION" : "MAKE A STATEMENT";

    const contextContext = context && context.length > 0 ? `Current Context: ${context.join(", ")}` : "No specific context.";
    const selectedWordsContext = selectedWords && selectedWords.length > 0
      ? `\nCRITICAL: The user has explicitly selected these words/topics: [${selectedWords.join(", ")}]. You MUST incorporate the CONCEPTS of ALL these explicitly selected words into EACH of the 4 sentence options. Do not make separate sentences for each word; synthesize them into a single cohesive, natural thought. For example, if they select "latte" and "muffin", suggest "I would like a latte and a muffin please". If they select "coffee" and "size", suggest something like "What sizes do you have for coffee?" or "I would like a large coffee". Be smart about how the ideas combine naturally.`
      : "";

    // Format Conversation History
    let historyPrompt = "";
    if (chatHistory && chatHistory.length > 0) {
      historyPrompt = `\nConversation History:\n${chatHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.text}`).join('\n')}\n`;
    }

    const systemPrompt = isInitiativeMode
      ? `You are the predictive "Brain" of an AAC (Augmentative and Alternative Communication) app.
Your user cannot speak. You must generate 4 perfect, full-sentence options for them to START or CONTINUE a conversation based on their current context and intentions.
${historyPrompt}
User's Environment & Intentions:
- Sentence Type: ${sentenceTypeDesc}${selectedWordsContext}`
      : `You are the predictive "Brain" of an AAC (Augmentative and Alternative Communication) app.
Your user cannot speak. You must generate 4 perfect, full-sentence options for them to say in reply to their conversation partner.

Listen to the partner's latest transcript and any history, and look at the User's current Intention settings.
${historyPrompt}
Partner's latest utterance: "${transcript}"

User's Intentions:
- Sentence Type: ${sentenceTypeDesc}${selectedWordsContext}`;

    const fullPrompt = `${systemPrompt}
- Attitude/Tone: ${toneDesc}
- Length/Brevity: ${brevityDesc}
- Understanding of partner: ${understandingDesc}
- Stance/Agreement: ${stanceDesc}
- Time Reference: ${timeDesc}
- Urgency: ${urgencyDesc}
- ${contextContext}

CRITICAL RULES:
1. Generate exactly 4 distinct sentence options.
2. The options MUST perfectly align with the User's Intentions (Tone, Stance, Time, etc.) and Selected Words. If multiple words are selected, MUST synthesize them into single natural sentences that make logical sense. If the stance is "disagreeing", provide 4 polite but firm ways to disagree.
3. You must also generate exactly ${requestedWordCount} individual words or short phrases that are highly relevant to the potential next steps of the conversation. 
   - If the Sentence Type is "ASK A QUESTION", heavily prioritize outputting question words (who, what, where, when, why, how, can, do) as well as specific drill-down topics related to the Context (e.g. if Context is "grocery", suggest "where", "vegetables", "tomatoes", "cost", etc) to allow the user to narrow down their question in steps.
   - Include numbers, days, times if relevant. 
   - Do NOT return words that the user has already selected.
4. Output MUST be valid JSON matching this exact schema:
{
  "words": [
    {
      "word": "menu",
      "theme": "ordering"
    },
    {
      "word": "tomorrow",
      "theme": "time"
    }
  ],
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

    let resultText = '{"responses": []}';

    if (model === "google") {
      const gResponse = await googleAi.models.generateContent({
        model: "gemini-2.5-flash", // Fallback until 3-flash is fully rolled out in the SDK
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });
      resultText = gResponse.text || resultText;
    } else {
      // default: openai
      const oResponse = await openai.chat.completions.create({
        model: "gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: fullPrompt }
        ]
        // Removed temperature: 0.7 because o1/o3/gpt-5 models only support default temperature
      });
      resultText = oResponse.choices[0]?.message?.content || resultText;
    }

    return NextResponse.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error("API /predict error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate prediction" }, { status: 500 });
  }
}
