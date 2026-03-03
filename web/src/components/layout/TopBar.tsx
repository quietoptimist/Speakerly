import { Menu, Mic, Zap, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
    isManualMode?: boolean;
    setIsManualMode?: (val: boolean) => void;
}

export function TopBar({ isManualMode = false, setIsManualMode }: TopBarProps) {
    return (
        <header className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex gap-2 items-center">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Menu className="h-6 w-6" />
                </Button>

                {/* Generation Mode Toggle */}
                {setIsManualMode && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsManualMode(!isManualMode)}
                        className={`border-slate-700 rounded-full flex gap-2 items-center px-3 ${isManualMode ? "bg-slate-800 text-slate-400" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            }`}
                        title={isManualMode ? "Manual Generation Mode" : "Auto Generation Mode"}
                    >
                        {isManualMode ? <Hand className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                        <span className="text-xs uppercase tracking-wider">{isManualMode ? "Manual" : "Auto"}</span>
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Pulsing Mic Indicator */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    <Mic className="h-5 w-5" />
                </div>
            </div>

            <div className="flex gap-2">
                {/* Context Pills */}
                <Button variant="secondary" size="sm" className="bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-full">
                    📍 Cafe
                </Button>
                <Button variant="secondary" size="sm" className="bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-full">
                    🗣️ Barista
                </Button>
            </div>
        </header>
    );
}
