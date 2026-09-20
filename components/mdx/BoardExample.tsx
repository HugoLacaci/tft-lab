import { Board } from "@/components/board/Board";
import type { PlacedUnit } from "@/lib/scenario-schema";
import { unitLookup, itemLookup } from "@/lib/set-data";
import { GENERIC_UNITS } from "@/data/archetypes";

/**
 * Static board inside a guide. Accepts the same `board`/`enemyBoard` arrays as
 * a scenario state. Uses generic archetype ids (see data/archetypes.ts) so the
 * example survives a set rollover.
 */
export function BoardExample({
  board,
  enemyBoard,
  caption,
  highlight,
}: {
  board: PlacedUnit[];
  enemyBoard?: PlacedUnit[];
  caption?: string;
  highlight?: { row: number; col: number }[];
}) {
  return (
    <figure className="my-6">
      <Board
        mode={enemyBoard ? "versus" : "own"}
        readonly
        board={board}
        enemyBoard={enemyBoard}
        units={{ ...unitLookup(), ...GENERIC_UNITS }}
        items={itemLookup()}
        highlight={highlight}
        chrome={false}
      />
      {caption ? <figcaption className="mt-2 text-center text-xs text-dim">{caption}</figcaption> : null}
    </figure>
  );
}
