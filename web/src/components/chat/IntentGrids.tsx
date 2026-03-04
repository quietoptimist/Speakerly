import { ClickableGrid } from "./ClickableGrid";
import { Button } from "@/components/ui/button";

interface IntentGridsProps {
    grid1: { x: number; y: number };
    setGrid1: (val: { x: number; y: number }) => void;
    grid2: { x: number; y: number };
    setGrid2: (val: { x: number; y: number }) => void;
    grid3: { x: number; y: number };
    setGrid3: (val: { x: number; y: number }) => void;
}

export function IntentGrids({ grid1, setGrid1, grid2, setGrid2, grid3, setGrid3 }: IntentGridsProps) {
    return (
        <div className="flex flex-col gap-4 w-full">
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
