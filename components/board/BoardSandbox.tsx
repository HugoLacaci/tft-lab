"use client";

import { useState } from "react";
import { Board } from "./Board";
import type { BenchUnit, PlacedUnit } from "@/lib/scenario-schema";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";

interface Sample {
  tank?: string;
  carry?: string;
  one?: string;
  two?: string;
  three?: string;
  five?: string;
  items: string[];
  comps: string[];
}

export function BoardSandbox({ units, items, traitNames, sample }: { units: Record<string, UnitLookup>; items: Record<string, ItemLookup>; traitNames: Record<string, string>; sample: Sample | null }) {
  const g = (k: keyof Sample, fallback: string) => (sample?.[k] as string | undefined) ?? fallback;
  const [mode, setMode] = useState<"own" | "versus">("own");
  const [readonly, setReadonly] = useState(false);
  const [generic, setGeneric] = useState(!sample);
  const [width, setWidth] = useState<number>(0);

  const real: { board: PlacedUnit[]; bench: BenchUnit[] } = {
    board: [
      { championId: g("tank", "generic:tank-4"), row: 0, col: 2, star: 2, items: sample?.items.slice(0, 2) ?? ["generic:item:tank-completed"] },
      { championId: g("one", "generic:bruiser-1"), row: 0, col: 3, star: 2, items: [] },
      { championId: g("two", "generic:bruiser-2"), row: 0, col: 4, star: 2, items: [] },
      { championId: g("three", "generic:support-3"), row: 1, col: 3, star: 1, items: [] },
      { championId: g("carry", "generic:carry-4"), row: 3, col: 5, star: 2, items: sample?.items.slice(2, 5) ?? ["generic:item:carry-completed"] },
      { championId: g("five", "generic:caster-5"), row: 3, col: 1, star: 1, items: [] },
    ],
    bench: [
      { championId: g("one", "generic:tank-1"), star: 1, items: [], slot: 0 },
      { championId: g("two", "generic:carry-2"), star: 3, items: [], slot: 1 },
    ],
  };
  const genericState: { board: PlacedUnit[]; bench: BenchUnit[] } = {
    board: [
      { championId: "generic:tank-4", row: 0, col: 2, star: 2, items: ["generic:item:tank-completed", "generic:item:tank"] },
      { championId: "generic:bruiser-2", row: 0, col: 3, star: 2, items: [] },
      { championId: "generic:tank-1", row: 0, col: 4, star: 2, items: [] },
      { championId: "generic:support-3", row: 1, col: 3, star: 1, items: [] },
      { championId: "generic:carry-4", row: 3, col: 5, star: 2, items: ["generic:item:carry-completed", "generic:item:ad", "generic:item:ad"] },
      { championId: "generic:caster-5", row: 3, col: 1, star: 1, items: [] },
    ],
    bench: [
      { championId: "generic:assassin-3", star: 1, items: [], slot: 0 },
      { championId: "generic:carry-2", star: 3, items: [], slot: 1 },
    ],
  };
  const [state, setState] = useState(generic ? genericState : real);
  const enemy: PlacedUnit[] = [
    { championId: "generic:assassin-4", row: 3, col: 0, star: 2, items: [] },
    { championId: "generic:assassin-3", row: 3, col: 6, star: 2, items: [] },
    { championId: "generic:tank-3", row: 0, col: 3, star: 2, items: [] },
    { championId: "generic:caster-4", row: 3, col: 3, star: 2, items: [] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`chip ${mode === "own" ? "chip-active" : ""}`} onClick={() => setMode("own")}>
          Own
        </button>
        <button type="button" className={`chip ${mode === "versus" ? "chip-active" : ""}`} onClick={() => setMode("versus")}>
          Versus
        </button>
        <button type="button" className={`chip ${readonly ? "chip-active" : ""}`} onClick={() => setReadonly((r) => !r)}>
          {readonly ? "Read-only" : "Editable"}
        </button>
        <button
          type="button"
          className={`chip ${generic ? "chip-active" : ""}`}
          onClick={() => {
            const next = !generic;
            setGeneric(next);
            setState(next ? genericState : real);
          }}
          disabled={!sample}
        >
          {generic ? "Generic archetypes" : "Live set units"}
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-dim">
          Container width
          <select className="input w-auto" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            <option value={0}>Fluid</option>
            <option value={360}>360px</option>
            <option value={480}>480px</option>
            <option value={768}>768px</option>
          </select>
        </label>
      </div>
      <div className="panel p-2 sm:p-4" style={{ width: width ? `${width}px` : undefined, maxWidth: "100%" }}>
        <Board
          mode={mode}
          readonly={readonly}
          board={state.board}
          bench={state.bench}
          enemyBoard={mode === "versus" ? enemy : undefined}
          shop={[state.board[0]?.championId ?? null, state.board[1]?.championId ?? null, null, state.bench[1]?.championId ?? null, state.board[4]?.championId ?? null]}
          status={{ gold: 54, hp: 62, level: 8, xpToNext: 24, xpNeeded: 76, stage: "4-2", streak: { type: "win", count: 3 }, items: sample?.comps ?? ["generic:item:ad", "generic:item:tank"] }}
          units={units}
          items={items}
          traitNames={traitNames}
          onChange={setState}
        />
      </div>
      <details className="text-xs text-dim">
        <summary className="cursor-pointer">State</summary>
        <pre className="mt-2 overflow-x-auto">{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  );
}
