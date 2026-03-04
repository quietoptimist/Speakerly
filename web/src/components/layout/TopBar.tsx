import { Menu, Zap, Hand, Plus, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
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
    onTranscription?: (text: string) => void;
    selectedModel?: string;
    setSelectedModel?: (val: string) => void;
}

export function TopBar({
    isManualMode = false, setIsManualMode,
    activeContexts = [], setActiveContexts,
    onTranscription,
    selectedModel = "openai", setSelectedModel
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
                        <span className="text-xs uppercase tracking-wider hidden sm:inline">{isManualMode ? "Manual" : "Auto"}</span>
                    </Button>
                )}

                {/* Model Selector */}
                {setSelectedModel && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-700 rounded-full flex gap-2 items-center px-3 bg-slate-800 text-slate-300 hover:text-white"
                                title="Select AI Provider"
                            >
                                <Brain className="h-3 w-3 text-purple-400" />
                                <span className="text-xs uppercase tracking-wider hidden sm:inline">{selectedModel}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-slate-900 border-slate-800 text-slate-200" align="start">
                            <DropdownMenuLabel>AI Provider</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuCheckboxItem
                                checked={selectedModel === "openai"}
                                onCheckedChange={() => setSelectedModel("openai")}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                            >
                                OpenAI (GPT-5-Mini)
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={selectedModel === "google"}
                                onCheckedChange={() => setSelectedModel("google")}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                            >
                                Google (Gemini-3-Flash)
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="flex items-center gap-3 relative z-50">
                {/* Audio Recorder in Header */}
                {onTranscription && (
                    <AudioRecorder onTranscription={onTranscription} />
                )}
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
