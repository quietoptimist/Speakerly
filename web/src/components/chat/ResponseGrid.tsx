import { Loader2, Volume2 } from "lucide-react";
import { useState } from "react";
import { speakText, cancelSpeech } from "@/lib/speech";

export interface ResponseItem {
    id?: number | string;
    body: string;
    // legacy fields retained for context-suggestion compatibility
    title?: string;
    color?: string;
}

interface ResponseGridProps {
    statementResponses: ResponseItem[];
    questionResponses: ResponseItem[];
    isLoading: boolean;
    onResponseSelect?: (response: ResponseItem) => void;
    onResponseSpeak?: (response: ResponseItem) => void;
}

export function ResponseGrid({ statementResponses, questionResponses, isLoading, onResponseSelect, onResponseSpeak }: ResponseGridProps) {
    const [playingId, setPlayingId] = useState<string | number | null>(null);

    const handleSpeak = (res: ResponseItem) => {
        cancelSpeech();
        const resId = res.id ?? res.body;
        setPlayingId(resId);
        if (onResponseSpeak) onResponseSpeak(res);
        speakText(res.body, undefined, () => setPlayingId(null));
    };

    const renderColumn = (items: ResponseItem[], colKey: string) => (
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none">
            {items.map((res, i) => {
                const resId = res.id ?? res.body ?? i;
                const isPlaying = playingId === resId;
                return (
                    <button
                        key={`${colKey}-${resId}-${i}`}
                        onClick={() => onResponseSelect?.(res)}
                        onDoubleClick={(e) => { e.preventDefault(); handleSpeak(res); }}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm leading-snug transition-all duration-150 active:scale-95
                            ${isPlaying
                                ? 'bg-slate-700 border-white/30 text-white ring-1 ring-white/30'
                                : 'bg-slate-900/50 border-slate-700/50 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            {isPlaying && <Volume2 className="h-3 w-3 shrink-0 animate-pulse fill-white" />}
                            {res.body}
                        </span>
                    </button>
                );
            })}
            {items.length === 0 && !isLoading && (
                <div className="flex-1 flex items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-lg text-xs">
                    —
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex-1 grid grid-cols-2 gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span>Statements</span>
                    <span>Questions</span>
                </div>
                {isLoading && <Loader2 className="h-3.5 w-3.5 text-cyan-500 animate-spin opacity-70 shrink-0" />}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3 overflow-hidden">
                {renderColumn(statementResponses, 'stmt')}
                {renderColumn(questionResponses, 'qst')}
            </div>
        </div>
    );
}
