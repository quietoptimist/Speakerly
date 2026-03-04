import { Button } from "@/components/ui/button";
import { Plus, Minus, Loader2 } from "lucide-react";

export interface SuggestedWord {
    word: string;
    theme: string;
}

interface WordCloudProps {
    words: SuggestedWord[];
    selectedWords: string[];
    onWordToggle: (word: string) => void;
    requestedCount: number;
    onCountChange: (delta: number) => void;
    isLoading: boolean;
    isQuestion: boolean;
    setIsQuestion: (val: boolean) => void;
}

// Generate consistent colors based on theme string
const getThemeColor = (theme: string) => {
    let hash = 0;
    for (let i = 0; i < theme.length; i++) {
        hash = theme.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        "bg-blue-500/20 text-blue-300 border-blue-500/30",
        "bg-green-500/20 text-green-300 border-green-500/30",
        "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        "bg-pink-500/20 text-pink-300 border-pink-500/30",
        "bg-orange-500/20 text-orange-300 border-orange-500/30",
        "bg-teal-500/20 text-teal-300 border-teal-500/30",
        "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        "bg-rose-500/20 text-rose-300 border-rose-500/30",
    ];
    return colors[Math.abs(hash) % colors.length];
};

export function WordCloud({ words, selectedWords, onWordToggle, requestedCount, onCountChange, isLoading, isQuestion, setIsQuestion }: WordCloudProps) {
    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-lg border border-slate-800 p-3 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2 shrink-0">
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Topics & Words</h2>
                    <div className="flex bg-slate-900/80 rounded-full p-0.5 border border-slate-800 w-fit">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsQuestion(false)}
                            className={`h-6 text-[10px] rounded-full px-4 transition-colors ${!isQuestion ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Statement
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsQuestion(true)}
                            className={`h-6 text-[10px] rounded-full px-4 transition-colors ${isQuestion ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Question
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col items-center bg-slate-800 rounded-md overflow-hidden border border-slate-700">
                    <button
                        onClick={() => onCountChange(1)}
                        disabled={requestedCount >= 40 || isLoading}
                        className="px-2 py-1 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                        <Plus className="h-3 w-3 text-slate-300" />
                    </button>
                    <div className="text-[10px] font-mono text-slate-400 border-y border-slate-700 w-full text-center py-0.5">
                        {requestedCount}
                    </div>
                    <button
                        onClick={() => onCountChange(-1)}
                        disabled={requestedCount <= 10 || isLoading}
                        className="px-2 py-1 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                        <Minus className="h-3 w-3 text-slate-300" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading && words.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 text-cyan-500 animate-spin opacity-50" />
                    </div>
                ) : (
                    <div className={`flex flex-wrap gap-2 content-start min-h-full pb-2 transition-opacity ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        {words.map((w) => {
                            const isSelected = selectedWords.includes(w.word);
                            const themeColor = getThemeColor(w.theme);

                            return (
                                <button
                                    key={w.word}
                                    onClick={() => onWordToggle(w.word)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${isSelected
                                        ? "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105"
                                        : `${themeColor} hover:brightness-125 hover:scale-105 active:scale-95`
                                        }`}
                                    title={`Theme: ${w.theme}`}
                                >
                                    {w.word}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
