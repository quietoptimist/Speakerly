import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface QuickRepliesProps {
    dynamicReplies?: string[];
    onReplySelect?: (text: string) => void;
}

export function QuickReplies({ dynamicReplies = [], onReplySelect }: QuickRepliesProps) {
    const staticReplies = ["Yes", "No", "Please", "Thank you", "Pardon", "Excuse me", "Hello", "Goodbye"];
    // Deduplicate and combine, keeping static first
    const allReplies = Array.from(new Set([...staticReplies, ...dynamicReplies]));

    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleSpeak = async (reply: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        setIsSynthesizing(reply);
        if (onReplySelect) onReplySelect(reply);

        try {
            const response = await fetch("/api/speak", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: reply }),
            });

            if (!response.ok) throw new Error("TTS Failed");

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                setIsSynthesizing(null);
                setPlayingId(reply);
            };

            audio.onended = () => {
                setPlayingId(null);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error("Failed to play quick reply:", error);
            setIsSynthesizing(null);
            setPlayingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
            <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[140px] pb-2 scrollbar-none">
                {allReplies.map((reply) => {
                    const isProcessing = isSynthesizing === reply;
                    const isPlaying = playingId === reply;
                    const isActive = isProcessing || isPlaying;

                    return (
                        <Button
                            key={reply}
                            variant="outline"
                            onClick={() => handleSpeak(reply)}
                            disabled={isActive}
                            className={`rounded-full px-4 py-3 text-base font-medium whitespace-nowrap transition-all duration-200 relative
                                ${isActive
                                    ? "border-emerald-500/50 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-95"
                                    : "border-cyan-500/30 text-cyan-400 bg-slate-900/50 hover:bg-cyan-500/10 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] active:scale-95"}`}
                        >
                            {isProcessing && <Loader2 className="h-4 w-4 animate-spin absolute left-2 opacity-50" />}
                            <span className={isProcessing ? "ml-4" : ""}>{reply}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
