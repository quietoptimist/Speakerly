import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { speakText, cancelSpeech } from "@/lib/speech";

interface QuickRepliesProps {
    dynamicReplies?: string[];
    onReplySelect?: (text: string) => void;
    onReplySpeak?: (text: string) => void;
}

export function QuickReplies({ dynamicReplies = [], onReplySelect, onReplySpeak }: QuickRepliesProps) {
    const staticReplies = ["Yes", "No", "Please", "Thank you", "Pardon", "Excuse me", "Hello", "Goodbye"];
    // Deduplicate and combine, keeping static first
    const allReplies = Array.from(new Set([...staticReplies, ...dynamicReplies]));

    const [playingId, setPlayingId] = useState<string | null>(null);

    const handleSpeak = (reply: string) => {
        cancelSpeech();
        setPlayingId(reply);
        if (onReplySpeak) onReplySpeak(reply);

        speakText(
            reply,
            undefined,
            () => setPlayingId(null)
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
            <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[140px] pb-2 scrollbar-none">
                {allReplies.map((reply) => {
                    const isActive = playingId === reply;

                    return (
                        <Button
                            key={reply}
                            variant="outline"
                            onClick={() => onReplySelect?.(reply)}
                            onDoubleClick={(e) => { e.preventDefault(); handleSpeak(reply); }}
                            disabled={isActive}
                            className={`rounded-full px-4 py-3 text-base font-medium whitespace-nowrap transition-all duration-200 relative
                                ${isActive
                                    ? "border-emerald-500/50 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-95"
                                    : "border-cyan-500/30 text-cyan-400 bg-slate-900/50 hover:bg-cyan-500/10 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] active:scale-95"}`}
                        >
                            {isActive && <Loader2 className="h-4 w-4 animate-spin absolute left-2 opacity-50" />}
                            <span className={isActive ? "ml-4" : ""}>{reply}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
