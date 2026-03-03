import { Button } from "@/components/ui/button";

export function QuickReplies() {
    const replies = ["Mhm", "Wait", "No", "Question"];

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
                {replies.map((reply) => (
                    <Button
                        key={reply}
                        variant="outline"
                        className="rounded-full border-cyan-500/30 text-cyan-400 bg-slate-900/50 hover:bg-cyan-500/10 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] px-6 py-6 text-lg font-medium whitespace-nowrap"
                    >
                        {reply}
                    </Button>
                ))}
            </div>
        </div>
    );
}
