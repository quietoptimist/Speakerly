import { Menu, Mic, Zap, Hand, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const AVAILABLE_CONTEXTS = [
    "📍 Cafe", "🗣️ Barista", "👨‍⚕️ Doctor", "🏥 Hospital",
    "🏠 Home", "👪 Family", "👔 Work", "🛒 Grocery Store"
];

interface TopBarProps {
    isManualMode?: boolean;
    setIsManualMode?: (val: boolean) => void;
    activeContexts?: string[];
    setActiveContexts?: (val: string[]) => void;
}

export function TopBar({
    isManualMode = false, setIsManualMode,
    activeContexts = [], setActiveContexts
}: TopBarProps) {

    const toggleContext = (context: string) => {
        if (!setActiveContexts) return;
        if (activeContexts.includes(context)) {
            setActiveContexts(activeContexts.filter(c => c !== context));
        } else {
            setActiveContexts([...activeContexts, context]);
        }
    };

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

            <div className="flex gap-2 flex-wrap justify-end">
                {/* Context Pills */}
                {activeContexts.map((ctx) => (
                    <Button
                        key={ctx}
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleContext(ctx)}
                        className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-red-400 rounded-full flex gap-1 items-center"
                        title="Remove Context"
                    >
                        {ctx}
                        <X className="h-3 w-3 opacity-50" />
                    </Button>
                ))}

                {/* Add Context Dropdown */}
                {setActiveContexts && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-full border-slate-700 border-dashed text-slate-400 hover:text-white bg-transparent">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Context
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800 text-slate-200" align="end">
                            <DropdownMenuLabel>Situational Context</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            {AVAILABLE_CONTEXTS.map(ctx => (
                                <DropdownMenuCheckboxItem
                                    key={ctx}
                                    checked={activeContexts.includes(ctx)}
                                    onCheckedChange={() => toggleContext(ctx)}
                                    className="focus:bg-slate-800 focus:text-white cursor-pointer"
                                >
                                    {ctx}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
