import Image from "next/image";
import { asset } from "@/lib/asset";
import { costColor } from "@/lib/costs";
import { COLS, ROWS, boardSize, displayCoord, hexOffset } from "@/lib/hex";
import type { PlacedUnit } from "@/lib/scenario-schema";
import type { UnitLookup } from "@/lib/set-data";

/**
 * Static thumbnail of a scenario board for puzzle cards: the hex grid with
 * cost-ringed portraits, enemy half above when the scenario has one. No
 * interaction, no dnd; renders on the server.
 */
export function MiniBoard({ board, enemyBoard = [], units, hex = 18, className = "" }: { board: PlacedUnit[]; enemyBoard?: PlacedUnit[]; units: Record<string, Pick<UnitLookup, "icon" | "cost" | "name">>; hex?: number; className?: string }) {
  const versus = enemyBoard.length > 0;
  const rows = versus ? ROWS * 2 : ROWS;
  const size = boardSize(rows);
  const cells: { side: "own" | "enemy"; row: number; col: number }[] = [];
  if (versus) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ side: "enemy", row: r, col: c });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ side: "own", row: r, col: c });
  return (
    <div className={`mini-board ${className}`} style={{ ["--mini-hex" as string]: `${hex}px`, width: size.w * hex, height: size.h * hex } as React.CSSProperties} aria-hidden>
      {cells.map(({ side, row, col }) => {
        const { drow, dcol } = displayCoord(side, { row, col }, versus ? "versus" : "own");
        const off = hexOffset(drow, dcol);
        const u = (side === "own" ? board : enemyBoard).find((x) => x.row === row && x.col === col);
        const lk = u ? units[u.championId] : undefined;
        return (
          <div key={`${side}-${row}-${col}`} className="mini-hex" style={{ left: off.x * hex, top: off.y * hex }}>
            <div className="hex h-full w-full" style={{ background: side === "enemy" ? "rgba(224,72,58,0.28)" : "rgba(200,170,110,0.28)" }}>
              <div className="hex h-full w-full" style={{ transform: "scale(0.9)", background: side === "enemy" ? "#1a0f12" : "#0f1622" }} />
            </div>
            {u && lk ? (
              <div className="mini-hex-unit absolute inset-0 flex items-center justify-center">
                <span className="hex block" style={{ width: hex * 0.78, height: hex * 0.78 * 1.1547, background: costColor(lk.cost), opacity: side === "enemy" ? 0.7 : 1 }}>
                  <span className="hex block h-full w-full overflow-hidden" style={{ transform: "scale(0.84)" }}>
                    <Image src={asset(lk.icon)} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" />
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
      {versus ? <div className="absolute left-0 right-0 h-px bg-gold opacity-50" style={{ top: ((hexOffset(4, 0).y + hexOffset(3, 0).y) / 2 + 0.577) * hex }} /> : null}
    </div>
  );
}
