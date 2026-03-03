import { ClickableGrid } from "./ClickableGrid";
import { Button } from "@/components/ui/button";

interface IntentGridsProps {
    grid1: { x: number; y: number };
    setGrid1: (val: { x: number; y: number }) => void;
    grid2: { x: number; y: number };
    setGrid2: (val: { x: number; y: number }) => void;
    grid3: { x: number; y: number };
    setGrid3: (val: { x: number; y: number }) => void;
    isQuestion: boolean;
    setIsQuestion: (val: boolean) => void;
}

export function IntentGrids({ grid1, setGrid1, grid2, setGrid2, grid3, setGrid3, isQuestion, setIsQuestion }: IntentGridsProps) {
    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Question / Statement Toggle */}
            <div className="flex justify-center">
                <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsQuestion(false)}
                        className={`rounded-full px-6 transition-colors ${!isQuestion ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        Statement
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsQuestion(true)}
                        className={`rounded-full px-6 transition-colors ${isQuestion ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        Question
                    </Button>
                </div>
            </div>

            {/* The 3 Grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 place-items-center w-full">
                <ClickableGrid
                    labelTop="Serious"
                    labelBottom="Funny"
                    labelLeft="Short"
                    labelRight="Long"
                    value={grid1}
                    onChange={setGrid1}
                    color="cyan"
                />
                <ClickableGrid
                    labelTop="Clear"
                    labelBottom="Confused"
                    labelLeft="Disagree"
                    labelRight="Agree"
                    value={grid2}
                    onChange={setGrid2}
                    color="purple"
                />
                <ClickableGrid
                    labelTop="Urgent"
                    labelBottom="Relaxed"
                    labelLeft="Past"
                    labelRight="Future"
                    value={grid3}
                    onChange={setGrid3}
                    color="emerald"
                />
            </div>
        </div>
    );
}
