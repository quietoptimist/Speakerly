import { cn } from "@/lib/utils";

interface ClickableGridProps {
    labelTop: string;
    labelBottom: string;
    labelLeft: string;
    labelRight: string;
    gridSize?: number; // Defaults to 5
    value: { x: number; y: number };
    onChange: (val: { x: number; y: number }) => void;
    color?: "cyan" | "purple" | "emerald";
}

export function ClickableGrid({
    labelTop,
    labelBottom,
    labelLeft,
    labelRight,
    gridSize = 5,
    value,
    onChange,
    color = "cyan",
}: ClickableGridProps) {
    // Map color to tailwind classes for the active cell
    const colorMap = {
        cyan: "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] border-cyan-400",
        purple: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)] border-purple-400",
        emerald: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] border-emerald-400",
    };
    const activeColor = colorMap[color];

    return (
        <div className="flex flex-col items-center select-none w-full max-w-[240px] mx-auto">
            <span className="text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">{labelTop}</span>
            <div className="flex items-center gap-2 w-full justify-center">
                <span className="text-[10px] text-slate-400 font-medium -rotate-90 w-4 text-center uppercase tracking-wider">{labelLeft}</span>

                <div
                    className="grid gap-[2px] bg-slate-900 border border-slate-800 p-1 rounded-md shadow-inner"
                    style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: gridSize }).map((_, y) =>
                        Array.from({ length: gridSize }).map((_, x) => {
                            // Mathematical coordinates: x: 0 (left) to 4 (right), y: 0 (bottom) to 4 (top)
                            // CSS grid draws exactly top-to-bottom, so y index 0 is top (value.y = 4)
                            const cellX = x;
                            const cellY = gridSize - 1 - y;
                            const isActive = value.x === cellX && value.y === cellY;

                            return (
                                <button
                                    key={`${x}-${y}`}
                                    onClick={() => onChange({ x: cellX, y: cellY })}
                                    className={cn(
                                        "w-6 h-6 rounded-[3px] transition-all duration-200 border",
                                        isActive
                                            ? activeColor
                                            : "bg-slate-800/80 border-slate-700/50 hover:bg-slate-700 hover:border-slate-500"
                                    )}
                                    aria-label={`Select ${cellX}, ${cellY}`}
                                />
                            );
                        })
                    )}
                </div>

                <span className="text-[10px] text-slate-400 font-medium rotate-90 w-4 text-center uppercase tracking-wider">{labelRight}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{labelBottom}</span>
        </div>
    );
}
