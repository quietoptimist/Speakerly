import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Volume2 } from "lucide-react";
import { useState, useRef } from "react";

export interface ResponseItem {
    id?: number | string;
    title: string;
    body: string;
    color: string;
}

interface ResponseGridProps {
    responses: ResponseItem[];
    isLoading: boolean;
    onResponseSelect?: (response: ResponseItem) => void;
}

export function ResponseGrid({ responses, isLoading, onResponseSelect }: ResponseGridProps) {
    const [playingId, setPlayingId] = useState<string | number | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState<string | number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleSpeak = async (res: ResponseItem) => {
        // Prevent overlapping audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const resId = res.id ?? res.title;
        setIsSynthesizing(resId);

        if (onResponseSelect) {
            onResponseSelect(res);
        }

        try {
            const response = await fetch("/api/speak", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: res.body }),
            });

            if (!response.ok) throw new Error("TTS Failed");

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                setIsSynthesizing(null);
                setPlayingId(resId);
            };

            audio.onended = () => {
                setPlayingId(null);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error("Failed to play audio:", error);
            setIsSynthesizing(null);
            setPlayingId(null);
        }
    };

    const getColorClasses = (color: string) => {
        switch (color) {
            case 'cyan': return 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
            case 'purple': return 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
            case 'emerald': return 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
            default: return 'border-slate-500/30 text-slate-300 hover:bg-slate-800 shadow-md';
        }
    };

    return (
        <div className="h-full flex flex-col pt-2 relative">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">AI Responses</h2>

            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-lg">
                    <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
                </div>
            )}

            <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full pb-4">
                {responses.map((res, i) => {
                    const resId = res.id ?? res.title ?? String(i);
                    const isPlaying = playingId === resId;
                    const isLoadingAudio = isSynthesizing === resId;

                    return (
                        <Card
                            key={resId}
                            onClick={() => handleSpeak(res)}
                            className={`bg-slate-900/40 cursor-pointer flex flex-col justify-center transition-all duration-200 ${isPlaying ? 'scale-95 ring-2 ring-white/50 bg-slate-800' : 'active:scale-95'
                                } ${getColorClasses(res.color)}`}
                        >
                            <CardHeader className="pb-2 text-center relative">
                                {isLoadingAudio && (
                                    <div className="absolute top-2 right-2">
                                        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                                    </div>
                                )}
                                {isPlaying && (
                                    <div className="absolute top-2 right-2">
                                        <Volume2 className="h-4 w-4 animate-pulse fill-white" />
                                    </div>
                                )}
                                <CardTitle className="text-2xl font-bold tracking-tight">{res.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-2xl tracking-normal opacity-90">{res.body}</p>
                            </CardContent>
                        </Card>
                    );
                })}
                {responses.length === 0 && !isLoading && (
                    <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-lg pb-6">
                        <span className="opacity-70">Say something to see predictions...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
