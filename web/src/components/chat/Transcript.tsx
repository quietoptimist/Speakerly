import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptProps {
    text: string;
}

export function Transcript({ text }: TranscriptProps) {
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transcript</h2>
            <ScrollArea className="flex-1 rounded-md bg-slate-900/50 p-4 border border-slate-800">
                <div className="text-slate-300 text-lg leading-relaxed">
                    <p>{text || <span className="text-slate-600 italic">Listening...</span>}</p>
                </div>
            </ScrollArea>
        </div>
    );
}
