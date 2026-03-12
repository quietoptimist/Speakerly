import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface ChatMessage {
    role: "user" | "partner";
    text: string;
}

interface TranscriptProps {
    messages: ChatMessage[];
    onClear: () => void;
}

export function Transcript({ messages, onClear }: TranscriptProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            // Need a tiny timeout to ensure DOM paints new messages before scrolling
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 50);
        }
    }, [messages]);

    return (
        <div className="h-full flex flex-col relative group">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversation History</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onClear}
                    className="h-6 text-[10px] rounded-full border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors flex gap-1 px-3"
                >
                    <Trash2 className="h-3 w-3" />
                    New Chat
                </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0 rounded-md bg-slate-900/50 p-4 border border-slate-800">
                <div className="flex flex-col gap-3">
                    {messages.length === 0 ? (
                        <div className="text-slate-600 italic text-sm text-center mt-4">No conversation history yet. Start talking!</div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={`msg-${msg.role}-${i}`} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm sm:text-base ${msg.role === "user"
                                    ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-br-sm"
                                    : "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm"
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>
        </div>
    );
}
