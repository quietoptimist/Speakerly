import { Menu, Zap, Hand, Brain, LogOut, User } from "lucide-react";
import Link from "next/link";
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
import { logout } from "@/app/login/actions";

interface TopBarProps {
    isManualMode?: boolean;
    setIsManualMode?: (val: boolean) => void;
    onTranscription?: (text: string) => void;
    selectedModel?: string;
    setSelectedModel?: (val: string) => void;
}

export function TopBar({
    isManualMode = false, setIsManualMode,
    onTranscription,
    selectedModel = "openai", setSelectedModel
}: TopBarProps) {

    return (
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
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
                                Google (Gemini-2.5-Flash)
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={selectedModel === "anthropic"}
                                onCheckedChange={() => setSelectedModel("anthropic")}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                            >
                                Anthropic (Claude-Haiku-4.5)
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
                
                {/* Profile Button */}
                <Link href="/profile">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                        title="My Profile"
                    >
                        <User className="h-4 w-4" />
                    </Button>
                </Link>

                {/* Logout Button */}
                <form action={logout}>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                        title="Sign Out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </form>
            </div>

        </header>
    );
}
