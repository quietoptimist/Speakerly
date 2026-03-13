import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as Blob;

        if (!file) {
            return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
        }

        // Convert Blob to File object for the SDK
        const ext = file.type.includes('wav') ? 'wav' : file.type.includes('mp4') ? 'mp4' : 'webm';
        const audioFile = new File([file], `audio.${ext}`, { type: file.type });

        const response = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en", // Hardcode to English for MVP speed
        });

        return NextResponse.json({ text: response.text });
    } catch (error: any) {
        console.error("API /transcribe error:", error);
        return NextResponse.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 });
    }
}
