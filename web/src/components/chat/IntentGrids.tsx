import { ClickableGrid } from "./ClickableGrid";

interface IntentGridsProps {
    grid1: { x: number; y: number };
    setGrid1: (val: { x: number; y: number }) => void;
    grid2: { x: number; y: number };
    setGrid2: (val: { x: number; y: number }) => void;
}

export function IntentGrids({ grid1, setGrid1, grid2, setGrid2 }: IntentGridsProps) {
    return (
        <div className="grid grid-cols-2 gap-4 place-items-center w-full">
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
                labelTop="Understand"
                labelBottom="Confused"
                labelLeft="Disagree"
                labelRight="Agree"
                value={grid2}
                onChange={setGrid2}
                color="purple"
            />
        </div>
    );
}
