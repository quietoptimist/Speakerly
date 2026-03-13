import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text, voice = "alloy" } = await req.json();

        if (!text) {
            return new NextResponse("Text is required", { status: 400 });
        }

        // Fetch directly from OpenAI API to bypass SDK buffering and stream the raw response body
        // This allows the browser to start playing the MP3 while it is still generating.
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice,
                input: text,
                response_format: "mp3"
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API error: ${err}`);
        }

        // Stream the response directly to the client
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, s-maxage=31536000, max-age=31536000",
            }
        });

    } catch (error: any) {
        console.error("API /speak error:", error);
        return new NextResponse(error.message || "Failed to generate speech", { status: 500 });
    }
}
