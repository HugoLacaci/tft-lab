"use client";

import { useEffect, useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import type { HexCoord } from "@/lib/hex";
import type { BenchUnit, PlacedUnit, Scenario } from "@/lib/scenario-schema";
import type { SessionData } from "@/lib/trainer-props";

/**
 * Board for one scenario. For placement questions the unit to place starts
 * on the bench and the board is editable; the answer is where the unit sits
 * when the user submits. Everything else is read-only.
 */
export function ScenarioBoard({
  scenario,
  data,
  placementUnit,
  onPlaced,
  highlight,
  selected = [],
  onUnitClick,
  locked,
}: {
  scenario: Scenario;
  data: SessionData;
  placementUnit: string | null;
  onPlaced: (hex: HexCoord | null) => void;
  highlight: HexCoord[];
  /** Units the user has selected (item-holder: one; swap: up to two), outlined in gold until graded. */
  selected?: PlacedUnit[];
  onUnitClick?: (unitId: string) => void;
  locked: boolean;
}) {
  const initial = useMemo(() => {
    const board = scenario.state.board.map((u) => ({ ...u }));
    let bench: BenchUnit[] = scenario.state.bench.map((u) => ({ ...u }));
    if (placementUnit) {
      // put the unit to place in the first free bench slot
      const used = new Set(bench.map((b) => b.slot ?? -1));
      let slot = 0;
      while (used.has(slot)) slot++;
      bench = [{ championId: placementUnit, star: 1, items: [], slot }, ...bench];
    }
    return { board, bench };
  }, [scenario, placementUnit]);

  const [state, setState] = useState(initial);
  useEffect(() => setState(initial), [initial]);

  useEffect(() => {
    if (!placementUnit) return;
    const u = state.board.find((x) => x.championId === placementUnit && !scenario.state.board.some((o) => o.row === x.row && o.col === x.col && o.championId === x.championId));
    onPlaced(u ? { row: u.row, col: u.col } : null);
  }, [state, placementUnit, onPlaced, scenario.state.board]);

  const editable = !!placementUnit && !locked;
  const hl = locked ? highlight : [...selected.map((u) => ({ row: u.row, col: u.col })), ...highlight];

  return (
    <div onClickCapture={onUnitClick ? (e) => handleUnitClick(e, state.board, onUnitClick) : undefined}>
      <Board
        mode={scenario.state.enemyBoard?.length ? "versus" : "own"}
        readonly={!editable}
        board={state.board}
        bench={state.bench}
        enemyBoard={scenario.state.enemyBoard}
        shop={scenario.state.shop}
        status={{
          gold: scenario.state.gold,
          hp: scenario.state.hp,
          level: scenario.state.level,
          xpToNext: scenario.state.xpToNext,
          xpNeeded: data.xpNeeded[scenario.state.level],
          stage: scenario.state.stage,
          streak: scenario.state.streak,
          items: scenario.state.items,
        }}
        units={data.units}
        items={data.items}
        traitNames={data.traitNames}
        highlight={hl}
        highlightColor={selected.length && !locked ? "var(--gold)" : "var(--teal)"}
        onChange={(n) => {
          // Only the placement unit may move; other units snap back.
          const moved = n.board.filter((u) => u.championId === placementUnit || scenario.state.board.some((o) => o.row === u.row && o.col === u.col && o.championId === u.championId));
          const fixedOk = scenario.state.board.every((o) => moved.some((u) => u.row === o.row && u.col === o.col && u.championId === o.championId));
          if (!fixedOk) return;
          setState({ board: moved, bench: n.bench });
        }}
      />
    </div>
  );
}

/** Item-holder questions: clicking a unit token on the board selects it. */
function handleUnitClick(e: React.MouseEvent, board: PlacedUnit[], onUnitClick: (id: string) => void) {
  const cell = (e.target as HTMLElement).closest('[role="gridcell"]') as HTMLElement | null;
  if (!cell) return;
  const label = cell.getAttribute("aria-label") ?? "";
  const m = label.match(/^(?:Enemy )?(front row|second row|third row|back row), column (\d+)/);
  if (!m || label.startsWith("Enemy")) return;
  const row = ["front row", "second row", "third row", "back row"].indexOf(m[1]!);
  const col = Number(m[2]) - 1;
  const u = board.find((x) => x.row === row && x.col === col);
  if (u) onUnitClick(u.championId);
}
