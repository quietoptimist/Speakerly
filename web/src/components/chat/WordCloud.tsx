import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface SuggestedWord {
    word: string;
    theme?: string;
}

interface WordCloudProps {
    statementWords: SuggestedWord[];
    questionWords: SuggestedWord[];
    selectedWords: string[];
    onWordToggle: (word: string) => void;
    isLoading: boolean;
    isManualMode?: boolean;
    onUpdateWords?: () => void;
    isWordsLoading?: boolean;
}

const unselectedWordClass = "bg-slate-800/60 text-slate-300 border-slate-700/50";

export function WordCloud({
    statementWords,
    questionWords,
    selectedWords,
    onWordToggle,
    isLoading,
    isManualMode,
    onUpdateWords,
    isWordsLoading
}: WordCloudProps) {
    const WordList = ({ words, label, isLoading: listLoading }: { words: SuggestedWord[], label: string, isLoading: boolean }) => (
        <div className="flex-1 flex flex-col min-w-0">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter mb-2 pl-1 italic">{label}</h3>
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {listLoading && words.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 text-cyan-500 animate-spin opacity-50" />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 content-start pb-2">
                        {words.map((w) => {
                            const isSelected = selectedWords.includes(w.word);
                            return (
                                <button
                                    key={w.word}
                                    onClick={() => onWordToggle(w.word)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${isSelected
                                        ? "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                                        : `${unselectedWordClass} hover:brightness-125 hover:scale-105 active:scale-95`
                                        }`}
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

    return (
        <div className="flex flex-col h-full bg-slate-900/40 rounded-lg border border-slate-800/80 p-3 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2 shrink-0 w-full">
                <div className="flex flex-col justify-start gap-1">
                    <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Suggested Topics</h2>
                    {isManualMode && onUpdateWords && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onUpdateWords}
                            disabled={!!(isWordsLoading || isLoading)}
                            className="w-fit h-6 text-[10px] border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400"
                        >
                            {isWordsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Refine
                        </Button>
                    )}
                </div>

            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                <WordList words={statementWords} label="Statements" isLoading={!!(isLoading || isWordsLoading)} />
                <div className="w-[1px] bg-slate-800/50 self-stretch my-2 shrink-0" />
                <WordList words={questionWords} label="Questions" isLoading={!!(isLoading || isWordsLoading)} />
            </div>
        </div>
    );
}
