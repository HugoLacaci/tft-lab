"use client";

/**
 * Team planner + fight simulator on the real board.
 *
 * Two teams (yours = blue, enemy = red), every champion, item and augment of
 * the live set, star levels, drag-and-drop positioning (from the pickers and
 * on the board), an in-game style trait column per side and a Monte-Carlo
 * fight (lib/sim). State persists in localStorage and can be shared as a URL
 * hash.
 */
import Image from "next/image";
import { asset } from "@/lib/asset";
import * as Tabs from "@radix-ui/react-tabs";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, pointerWithin, rectIntersection, useDndMonitor, useDraggable, useSensor, useSensors, type CollisionDetection } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Board, type BoardSide } from "@/components/board/Board";
import { ChampionCard, Hover, ItemCard, TagChips, tagsFor } from "@/components/set/hovers";
import { ItemIcon, TierBadge, TraitIcon, UnitIcon } from "@/components/set/icons";
import { RankBadge } from "@/components/set/RankBadge";
import type { Rank } from "@/lib/tiers";
import { COSTS, type Cost } from "@/lib/costs";
import type { HexCoord } from "@/lib/hex";
import type { PlacedUnit } from "@/lib/scenario-schema";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { activeTraits, simulate, type ActiveTrait, type Side, type SimData, type SimResult, type SimTeam, type SimUnit, type Star } from "@/lib/sim";
import { readJson, writeJson } from "@/lib/storage";
import { TAG_LABEL, TAGS, type Tag } from "@/lib/tags";
import type { Augment, Champion, Item, ItemKind, Trait } from "@/lib/types";

export interface PlannerData {
  setNumber: number;
  patch: string;
  /** strength badges this patch, by id (optional) */
  itemRanks?: Record<string, Rank>;
  augmentRanks?: Record<string, Rank>;
  champions: Champion[];
  items: Item[];
  traits: Trait[];
  augments: Augment[];
}

interface PlannerState {
  version: 1;
  mode: "planner" | "versus";
  blue: SimTeam;
  red: SimTeam;
}

const KEY = "tftlab.planner.v1";
const EMPTY: PlannerState = { version: 1, mode: "versus", blue: { units: [], augments: [] }, red: { units: [], augments: [] } };
const ITEM_KINDS: { kind: ItemKind; label: string }[] = [
  { kind: "completed", label: "Completed" },
  { kind: "component", label: "Components" },
  { kind: "emblem", label: "Emblems" },
  { kind: "artifact", label: "Artifacts" },
  { kind: "radiant", label: "Radiant" },
  { kind: "support", label: "Support" },
];
const SIDE_LABEL: Record<Side, string> = { blue: "Your board", red: "Enemy" };
const SIDE_COLOR: Record<Side, string> = { blue: "var(--teal)", red: "var(--red)" };
/** Drop where the pointer is (picker cards are much wider than a hex); fall back to rects for keyboard drags. */
const dropAtPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};
const toSide = (s: BoardSide): Side => (s === "own" ? "blue" : "red");
const toBoardSide = (s: Side): BoardSide => (s === "blue" ? "own" : "enemy");

function toPlaced(units: SimUnit[]): PlacedUnit[] {
  return units.map((u) => ({ championId: u.championId, row: u.row, col: u.col, star: u.star, items: u.items }));
}
function fromPlaced(units: PlacedUnit[]): SimUnit[] {
  return units.map((u) => ({ championId: u.championId, row: u.row, col: u.col, star: u.star, items: u.items }));
}

function encodeState(s: PlannerState): string {
  const json = JSON.stringify({ m: s.mode, b: s.blue, r: s.red });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeState(h: string): PlannerState | null {
  try {
    const b64 = h.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const o = JSON.parse(json) as { m: PlannerState["mode"]; b: SimTeam; r: SimTeam };
    if (!o.b || !o.r) return null;
    return { version: 1, mode: o.m === "planner" ? "planner" : "versus", blue: o.b, red: o.r };
  } catch {
    return null;
  }
}

export function TeamPlanner({ data }: { data: PlannerData }) {
  const simData = useMemo<SimData>(
    () => ({
      champions: Object.fromEntries(data.champions.map((c) => [c.id, c])),
      items: Object.fromEntries(data.items.map((i) => [i.id, i])),
      traits: Object.fromEntries(data.traits.map((t) => [t.id, t])),
      augments: Object.fromEntries(data.augments.map((a) => [a.id, a])),
    }),
    [data],
  );
  const unitLookup = useMemo<Record<string, UnitLookup>>(
    () => Object.fromEntries(data.champions.map((c) => [c.id, { id: c.id, name: c.name, cost: c.cost, icon: c.icon, traits: c.traits, ability: { name: c.ability.name, desc: c.ability.desc } }])),
    [data.champions],
  );
  const itemLookup = useMemo<Record<string, ItemLookup>>(() => Object.fromEntries(data.items.map((i) => [i.id, { id: i.id, name: i.name, icon: i.icon, kind: i.kind }])), [data.items]);
  const components = useMemo(() => Object.fromEntries(data.items.filter((i) => i.kind === "component").map((i) => [i.id, { id: i.id, name: i.name, icon: i.icon }])), [data.items]);
  const traitNames = useMemo(() => Object.fromEntries(data.traits.map((t) => [t.id, t.name])), [data.traits]);

  const [state, setState] = useState<PlannerState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Side>("blue");
  const [selected, setSelected] = useState<{ side: Side; hex: HexCoord } | null>(null);
  const [runs, setRuns] = useState(200);
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // load: URL hash wins over localStorage
  useEffect(() => {
    const h = typeof window !== "undefined" ? window.location.hash.match(/[#&]f=([A-Za-z0-9_-]+)/) : null;
    const fromHash = h ? decodeState(h[1]!) : null;
    const stored = readJson<PlannerState | null>(KEY, null);
    const s = fromHash ?? (stored && stored.version === 1 ? stored : EMPTY);
    const clean = (t: SimTeam): SimTeam => ({ units: t.units.filter((u) => simData.champions[u.championId]).map((u) => ({ ...u, items: u.items.filter((i) => simData.items[i]) })), augments: t.augments.filter((a) => simData.augments[a]) });
    setState({ ...s, blue: clean(s.blue), red: clean(s.red) });
    setLoaded(true);
  }, [simData]);
  useEffect(() => {
    if (loaded) writeJson(KEY, state);
  }, [state, loaded]);
  useEffect(() => {
    setResult(null);
  }, [state]);

  const team = state[editing];
  const setTeam = useCallback((side: Side, fn: (t: SimTeam) => SimTeam) => setState((s) => ({ ...s, [side]: fn(s[side]) })), []);

  const selectedUnit = selected ? (state[selected.side].units.find((u) => u.row === selected.hex.row && u.col === selected.hex.col) ?? null) : null;

  const freeHex = (side: Side, champ: Champion): HexCoord | null => {
    const occ = new Set(state[side].units.map((u) => `${u.row},${u.col}`));
    if (selected && selected.side === side && !occ.has(`${selected.hex.row},${selected.hex.col}`)) return selected.hex;
    const rows = champ.stats.range > 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const cols = [3, 2, 4, 1, 5, 0, 6];
    for (const row of rows) for (const col of cols) if (!occ.has(`${row},${col}`)) return { row, col };
    return null;
  };

  const placeChampion = (c: Champion, side: Side, hex: HexCoord | null) => {
    const target = hex ?? freeHex(side, c);
    if (!target) {
      setMsg("No free hex on that board.");
      return;
    }
    setTeam(side, (t) => ({ ...t, units: [...t.units.filter((u) => !(u.row === target.row && u.col === target.col)), { championId: c.id, row: target.row, col: target.col, star: 2, items: [] }] }));
    setSelected({ side, hex: target });
    if (state.mode === "versus") setEditing(side);
    setMsg("");
  };
  const updateUnit = (side: Side, hex: HexCoord, fn: (u: SimUnit) => SimUnit | null) => {
    setTeam(side, (t) => ({ ...t, units: t.units.flatMap((u) => (u.row === hex.row && u.col === hex.col ? (fn(u) ? [fn(u)!] : []) : [u])) }));
  };
  const updateSelected = (fn: (u: SimUnit) => SimUnit | null) => {
    if (selected) updateUnit(selected.side, selected.hex, fn);
  };
  const giveItem = (it: Item, side: Side, hex: HexCoord) => {
    const u = state[side].units.find((x) => x.row === hex.row && x.col === hex.col);
    if (!u) {
      setMsg("Drop items on a unit.");
      return;
    }
    if (u.items.length >= 3) {
      setMsg(`${simData.champions[u.championId]?.name ?? "That unit"} already holds 3 items. Remove one first.`);
      return;
    }
    updateUnit(side, hex, (x) => ({ ...x, items: [...x.items, it.id] }));
    setSelected({ side, hex });
    setMsg("");
  };
  const addItemToSelected = (it: Item) => {
    if (!selected || !selectedUnit) {
      setMsg("Select a unit on the board first (or drag the item onto one).");
      return;
    }
    giveItem(it, selected.side, selected.hex);
  };
  const toggleAugment = (a: Augment, side: Side) => {
    const cur = state[side].augments;
    if (!cur.includes(a.id) && cur.length >= 3) {
      setMsg("Three augments per side. Remove one first.");
      return;
    }
    setTeam(side, (t) => (t.augments.includes(a.id) ? { ...t, augments: t.augments.filter((x) => x !== a.id) } : { ...t, augments: [...t.augments, a.id] }));
  };
  const removeUnit = (side: Side, hex: HexCoord) => {
    updateUnit(side, hex, () => null);
    if (selected && selected.side === side && selected.hex.row === hex.row && selected.hex.col === hex.col) setSelected(null);
  };

  const onBoardChange = (n: { board: PlacedUnit[]; enemyBoard: PlacedUnit[] }) => {
    setState((s) => ({ ...s, blue: { ...s.blue, units: fromPlaced(n.board) }, red: { ...s.red, units: fromPlaced(n.enemyBoard) } }));
    setSelected(null);
  };
  const onForeignDrop = (activeId: string, bside: BoardSide, hex: HexCoord) => {
    const side = toSide(bside);
    const m = activeId.match(/^pick:(champion|item):(.+)$/);
    if (!m) return;
    if (m[1] === "champion") {
      const c = simData.champions[m[2]!];
      if (c) placeChampion(c, side, hex);
    } else {
      const it = simData.items[m[2]!];
      if (it) giveItem(it, side, hex);
    }
  };

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        setResult(simulate(state.blue, state.red, simData, { runs, seed: Date.now() & 0xffff }));
      } finally {
        setBusy(false);
      }
    }, 10);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#f=${encodeState(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Link copied.");
    } catch {
      window.location.hash = `f=${encodeState(state)}`;
      setMsg("Link is in the address bar.");
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const traitsFor = (side: Side) => activeTraits(state[side], simData);
  const canFight = state.mode === "versus" && state.blue.units.length > 0 && state.red.units.length > 0;

  if (!loaded) return <p className="text-dim">Loading…</p>;

  return (
    <DndContext sensors={sensors} collisionDetection={dropAtPointer}>
      <div className="space-y-4">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Mode</span>
          <button type="button" className={`chip ${state.mode === "planner" ? "chip-active" : ""}`} aria-pressed={state.mode === "planner"} onClick={() => setState((s) => ({ ...s, mode: "planner" }))}>
            Planner
          </button>
          <button type="button" className={`chip ${state.mode === "versus" ? "chip-active" : ""}`} aria-pressed={state.mode === "versus"} onClick={() => setState((s) => ({ ...s, mode: "versus" }))}>
            Versus
          </button>
          {state.mode === "versus" ? (
            <>
              <span className="display ml-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Editing</span>
              {(["blue", "red"] as Side[]).map((s) => (
                <button key={s} type="button" className={`chip ${editing === s ? "chip-active" : ""}`} style={{ borderColor: editing === s ? SIDE_COLOR[s] : undefined }} aria-pressed={editing === s} onClick={() => setEditing(s)}>
                  {SIDE_LABEL[s]}
                </button>
              ))}
            </>
          ) : null}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-dim">
              Runs
              <select className="input w-auto !py-1" value={runs} onChange={(e) => setRuns(Number(e.target.value))}>
                {[100, 200, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={run} disabled={!canFight || busy} title={canFight ? "" : "Versus mode with units on both boards"}>
              {busy ? "Simulating…" : "Simulate fight"}
            </button>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" className="btn btn-sm" onClick={() => setState((s) => ({ ...s, blue: s.red, red: s.blue }))} disabled={state.mode !== "versus"}>
            Swap sides
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setTeam(editing, () => ({ units: [], augments: [] }))}>
            Clear {state.mode === "versus" ? SIDE_LABEL[editing].toLowerCase() : "board"}
          </button>
          <button type="button" className="btn btn-sm" onClick={share}>
            Copy link
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setState({ ...EMPTY, mode: state.mode })}>
            Reset all
          </button>
          {msg ? (
            <span className="text-dim" role="status">
              {msg}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_22rem]">
          {/* far left: trait columns, outside the board panel */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            {state.mode === "versus" ? <TraitColumn side="red" traits={traitsFor("red")} lookup={simData.traits} count={state.red.units.length} /> : null}
            <TraitColumn side="blue" traits={traitsFor("blue")} lookup={simData.traits} count={state.blue.units.length} />
          </div>
          {/* middle: board, then selection + results */}
          <div className="min-w-0 space-y-4">
            <div className="panel p-2 sm:p-4">
              <div>
                <div className="min-w-0">
                  <Board
                    mode={state.mode === "versus" ? "versus" : "own"}
                    board={toPlaced(state.blue.units)}
                    enemyBoard={state.mode === "versus" ? toPlaced(state.red.units) : undefined}
                    enemyEditable
                    externalDnd
                    units={unitLookup}
                    items={itemLookup}
                    traitNames={traitNames}
                    chrome={false}
                    tokenScale={0.9}
                    maxHex={68}
                    selected={selected ? { side: toBoardSide(selected.side), hex: selected.hex } : null}
                    highlightColor="var(--gold)"
                    onChange={onBoardChange}
                    onForeignDrop={onForeignDrop}
                    onRemoveUnit={(s, hex) => removeUnit(toSide(s), hex)}
                    onCellClick={(s, hex) => {
                      const side = toSide(s);
                      setSelected({ side, hex });
                      if (state.mode === "versus") setEditing(side);
                    }}
                  />
                  <div className="mt-1 text-center text-[0.65rem] uppercase tracking-wider text-dim">Click a hex to select · drag from the lists or between hexes · ✕ removes</div>
                </div>
              </div>
            </div>

            {selectedUnit && selected ? (
              <UnitEditor
                unit={selectedUnit}
                side={selected.side}
                champion={simData.champions[selectedUnit.championId]!}
                items={simData.items}
                traitNames={traitNames}
                onStar={(star) => updateSelected((u) => ({ ...u, star }))}
                onRemoveItem={(idx) => updateSelected((u) => ({ ...u, items: u.items.filter((_, i) => i !== idx) }))}
                onRemove={() => removeUnit(selected.side, selected.hex)}
                onCopyToOther={() => {
                  const other: Side = selected.side === "blue" ? "red" : "blue";
                  const c = simData.champions[selectedUnit.championId]!;
                  const occ = new Set(state[other].units.map((u) => `${u.row},${u.col}`));
                  const hex = !occ.has(`${selectedUnit.row},${selectedUnit.col}`) ? { row: selectedUnit.row, col: selectedUnit.col } : freeHex(other, c);
                  if (!hex) return;
                  setTeam(other, (t) => ({ ...t, units: [...t.units, { ...selectedUnit, row: hex.row, col: hex.col }] }));
                }}
              />
            ) : (
              <p className="text-xs text-dim">Drag a champion onto a hex, or click one to auto-place it (ranged units go to the back row, melee to the front). Drag an item onto a unit, or select the unit and click the item. Click a placed unit to change its star level.</p>
            )}

            {result ? <Results result={result} champions={simData.champions} items={itemLookup} /> : null}
          </div>

          {/* right: pickers */}
          <aside className="min-w-0">
            <Tabs.Root defaultValue="champions" className="panel p-3">
              <Tabs.List className="mb-3 flex gap-1" aria-label="Pickers">
                {[
                  ["champions", "Champions"],
                  ["items", "Items"],
                  ["augments", "Augments"],
                ].map(([v, l]) => (
                  <Tabs.Trigger key={v} value={v!} className="chip data-[state=active]:chip-active data-[state=active]:text-gold-bright data-[state=active]:border-gold">
                    {l}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <div className="mb-2 text-[0.65rem] uppercase tracking-wider text-dim">
                Adding to <span style={{ color: SIDE_COLOR[editing] }}>{state.mode === "versus" ? SIDE_LABEL[editing] : "your board"}</span> · hold to see the tooltip · drag onto the board
              </div>
              <Tabs.Content value="champions">
                <ChampionPicker champions={data.champions} traits={simData.traits} onPick={(c) => placeChampion(c, editing, null)} />
              </Tabs.Content>
              <Tabs.Content value="items">
                <ItemPicker items={data.items} components={components} traits={simData.traits} ranks={data.itemRanks ?? {}} onPick={addItemToSelected} target={selectedUnit ? (simData.champions[selectedUnit.championId]?.name ?? null) : null} />
              </Tabs.Content>
              <Tabs.Content value="augments">
                <AugmentPicker augments={data.augments} chosen={team.augments} ranks={data.augmentRanks ?? {}} onToggle={(a) => toggleAugment(a, editing)} />
              </Tabs.Content>
            </Tabs.Root>
          </aside>
        </div>

        <details className="text-xs text-dim">
          <summary className="cursor-pointer">How the fight is estimated</summary>
          <div className="mt-2 max-w-3xl space-y-1">
            <p>
              This is a model, not the game client. Unit base stats, attack speed, crit, range and mana come from the Set {data.setNumber} data (patch {data.patch}); item stats come from the item effects. Riot ships no ability numbers, so an ability is worth a cost-based
              amount (1-cost 180 … 5-cost 520 at 100 AP, ×1.5 per star) scaled by AP, or by AD when its text scales with AD; abilities that mention heals, shields or stuns trade part of that damage for the effect, and area abilities splash 45% to hexes around the target.
            </p>
            <p>
              Active trait breakpoints give their holders a bonus by tier (bronze 6%, silver 12%, gold 20%, prismatic 32% to HP and damage). Augments give the team 3/6/10% by tier, skewed towards damage or HP by their text; economy augments do nothing in combat. Named items the
              engine understands: Guinsoo, Titan&apos;s, Kraken&apos;s, Warmog&apos;s, Dragon&apos;s Claw, Sunfire, Red Buff, Morello, Bramble, Ionic Spark, Evenshroud, Void Staff, Last Whisper, Bloodthirster, Sterak&apos;s, Edge of Night, Protector&apos;s Vow, Crownguard, Archangel&apos;s, Blue Buff, Gunblade, Giant Slayer, Striker&apos;s
              Flail, Steadfast Heart, Quicksilver, Spirit Visage, IE/JG spell crit. Everything else is its raw stats.
            </p>
            <p>Use it to compare two boards or two item sets relative to each other, not to predict an exact outcome.</p>
          </div>
        </details>
      </div>
      <PickOverlay champions={simData.champions} items={simData.items} />
    </DndContext>
  );
}

// ---------------------------------------------------------------- pieces --

/** Ghost shown while dragging a picker card. */
function PickOverlay({ champions, items }: { champions: Record<string, Champion>; items: Record<string, Item> }) {
  const [active, setActive] = useState<string | null>(null);
  useDndMonitor({ onDragStart: (e) => setActive(String(e.active.id)), onDragEnd: () => setActive(null), onDragCancel: () => setActive(null) });
  const m = active?.match(/^pick:(champion|item):(.+)$/);
  if (!m) return null;
  const c = m[1] === "champion" ? champions[m[2]!] : null;
  const i = m[1] === "item" ? items[m[2]!] : null;
  return (
    <DragOverlay dropAnimation={null}>
      {c ? <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={44} /> : null}
      {i ? <ItemIcon icon={i.icon} name={i.name} size={32} /> : null}
    </DragOverlay>
  );
}

function Pick({ id, children, className, onClick, disabled, title }: { id: string; children: React.ReactNode; className: string; onClick: () => void; disabled?: boolean; title?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} type="button" className={`${className} ${isDragging ? "opacity-40" : ""}`} style={{ touchAction: "none" }} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

const STYLE_HEX: Record<string, string> = { bronze: "var(--style-bronze)", silver: "var(--style-silver)", gold: "var(--style-gold)", prismatic: "var(--style-prismatic)", unique: "var(--style-unique)" };

/** In-game style vertical trait list: hex badge coloured by tier, count, name. */
function TraitColumn({ side, traits, lookup, count }: { side: Side; traits: ActiveTrait[]; lookup: Record<string, Trait>; count: number }) {
  const active = traits.filter((t) => t.reached > 0);
  const inactive = traits.filter((t) => t.reached === 0);
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="display text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: SIDE_COLOR[side] }}>
          {SIDE_LABEL[side]}
        </span>
        <span className="text-[0.65rem] text-dim">{count} units</span>
      </div>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
        {active.map((t) => (
          <li key={t.id} className="flex items-center gap-2" title={`${t.name}: ${t.count} (${t.reached}${t.next ? ` → ${t.next}` : ""})`}>
            <span className="hex flex h-10 w-9 shrink-0 items-center justify-center" style={{ background: STYLE_HEX[t.style ?? "bronze"] }}>
              <span className="hex flex h-[86%] w-[86%] items-center justify-center bg-[var(--bg-deep)]">
                <TraitIcon icon={lookup[t.id]?.icon ?? ""} name={t.name} size={20} />
              </span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm text-gold-bright">{t.name}</span>
              <span className="text-xs tabular-nums" style={{ color: STYLE_HEX[t.style ?? "bronze"] }}>
                {t.count}
                <span className="text-dim">{t.next ? ` / ${t.next}` : ""}</span>
              </span>
            </span>
          </li>
        ))}
        {inactive.map((t) => (
          <li key={t.id} className="flex items-center gap-2 opacity-60" title={`${t.name}: ${t.count}/${t.next ?? "?"}`}>
            <span className="hex flex h-8 w-7 shrink-0 items-center justify-center bg-[var(--bg-raised)]">
              <span className="hex flex h-[86%] w-[86%] items-center justify-center bg-[var(--bg-deep)]">
                <TraitIcon icon={lookup[t.id]?.icon ?? ""} name={t.name} size={16} />
              </span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs text-dim">{t.name}</span>
              <span className="text-[0.65rem] tabular-nums text-dim">
                {t.count} / {t.next ?? "?"}
              </span>
            </span>
          </li>
        ))}
        {traits.length === 0 ? <li className="text-xs text-dim">No units yet.</li> : null}
      </ul>
    </div>
  );
}

function UnitEditor({
  unit,
  side,
  champion,
  items,
  traitNames,
  onStar,
  onRemoveItem,
  onRemove,
  onCopyToOther,
}: {
  unit: SimUnit;
  side: Side;
  champion: Champion;
  items: Record<string, Item>;
  traitNames: Record<string, string>;
  onStar: (s: Star) => void;
  onRemoveItem: (idx: number) => void;
  onRemove: () => void;
  onCopyToOther: () => void;
}) {
  const hp = Math.round(champion.stats.hp * { 1: 1, 2: 1.8, 3: 3.24 }[unit.star]);
  const ad = Math.round(champion.stats.ad * { 1: 1, 2: 1.5, 3: 2.25 }[unit.star]);
  return (
    <div className="panel p-3">
      <div className="flex flex-wrap items-start gap-3">
        <UnitIcon icon={champion.icon} name={champion.name} cost={champion.cost} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display text-base text-gold-bright">{champion.name}</span>
            <span className="text-xs" style={{ color: SIDE_COLOR[side] }}>
              {SIDE_LABEL[side]} · row {unit.row + 1}, col {unit.col + 1}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-gold">{champion.traits.map((t) => traitNames[t] ?? t).join(" · ")}</div>
          <div className="mt-1 text-[0.7rem] text-dim">
            {hp} HP · {ad} AD · {champion.stats.attackSpeed.toFixed(2)} AS · {champion.stats.armor}/{champion.stats.mr} res · range {champion.stats.range} · {champion.stats.mana} mana
            {champion.ability.scaling.ad && champion.ability.scaling.ap ? " · ability scales AD+AP" : champion.ability.scaling.ad ? " · ability scales AD" : " · ability scales AP"}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="display text-[0.6rem] uppercase tracking-wider text-dim">Star</span>
            {([1, 2, 3] as Star[]).map((s) => (
              <button key={s} type="button" className={`chip ${unit.star === s ? "chip-active" : ""}`} aria-pressed={unit.star === s} onClick={() => onStar(s)}>
                {"★".repeat(s)}
              </button>
            ))}
            <span className="display ml-2 text-[0.6rem] uppercase tracking-wider text-dim">Items</span>
            {unit.items.map((id, idx) => {
              const it = items[id];
              return (
                <button key={`${id}-${idx}`} type="button" className="flex items-center gap-1 border border-[var(--gold-dim)] px-1 py-0.5 text-xs hover:border-danger" title={`Remove ${it?.name ?? id}`} onClick={() => onRemoveItem(idx)}>
                  <ItemIcon icon={it?.icon ?? ""} name={it?.name ?? id} size={20} />
                  <span className="max-w-[8rem] truncate">{it?.name ?? id}</span>
                  <span aria-hidden>✕</span>
                </button>
              );
            })}
            {unit.items.length < 3 ? <span className="text-[0.7rem] text-dim">{3 - unit.items.length} free · pick from the Items tab</span> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" className="btn btn-sm" onClick={onCopyToOther}>
            Copy to {side === "blue" ? "enemy" : "your board"}
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>
            Remove unit
          </button>
        </div>
      </div>
    </div>
  );
}

function ChampionPicker({ champions, traits, onPick }: { champions: Champion[]; traits: Record<string, Trait>; onPick: (c: Champion) => void }) {
  const [q, setQ] = useState("");
  const [cost, setCost] = useState<Cost | 0>(0);
  const [trait, setTrait] = useState("");
  const [summons, setSummons] = useState(false);
  const list = champions.filter(
    (c) =>
      (summons ? c.id.startsWith("summon:") : !c.id.startsWith("summon:")) &&
      (!cost || c.cost === cost) &&
      (!trait || c.traits.includes(trait)) &&
      (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.traits.some((t) => traits[t]?.name.toLowerCase().includes(q.toLowerCase()))),
  );
  const traitList = Object.values(traits).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <input className="input !py-1 text-sm" placeholder="Search name or trait" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search champions" />
        <div className="flex gap-1" role="group" aria-label="Filter by cost">
          {COSTS.map((c) => (
            <button key={c} type="button" className={`chip ${cost === c ? "chip-active" : ""}`} style={{ borderColor: cost === c ? `var(--cost-${c})` : undefined }} aria-pressed={cost === c} onClick={() => setCost(cost === c ? 0 : c)}>
              {c}
            </button>
          ))}
        </div>
        <select className="input !py-1 text-sm" value={trait} onChange={(e) => setTrait(e.target.value)} aria-label="Filter by trait">
          <option value="">All traits</option>
          {traitList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {champions.some((c) => c.id.startsWith("summon:")) ? (
          <button type="button" className={`chip ${summons ? "chip-active" : ""}`} aria-pressed={summons} onClick={() => setSummons((v) => !v)} title="Units granted by traits, augments or wisps: dummies, Elderwood plants, PvE monsters">
            Summons
          </button>
        ) : null}
      </div>
      {summons ? <p className="mb-2 text-[0.7rem] text-dim">Granted units. Riot ships stats for the dummy and the monsters; the Elderwood plants are estimates for the simulator.</p> : null}
      <ul className="grid max-h-[32rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
        {list.map((c) => (
          <li key={c.id}>
            <Hover content={<ChampionCard c={c} traits={traits} />} side="left">
              <Pick id={`pick:champion:${c.id}`} className="notch flex w-full cursor-grab items-center gap-2 border border-[var(--gold-dim)] bg-[var(--bg-raised)] p-1.5 text-left hover:border-gold active:cursor-grabbing" onClick={() => onPick(c)}>
                <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={30} />
                <span className="min-w-0">
                  <span className="block truncate text-xs text-gold-bright">{c.name}</span>
                  <span className="block truncate text-[0.6rem] text-dim">{c.traits.map((t) => traits[t]?.name ?? t).join(" · ")}</span>
                </span>
              </Pick>
            </Hover>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemPicker({ items, components, traits, ranks, onPick, target }: { items: Item[]; components: Record<string, { id: string; name: string; icon: string }>; traits: Record<string, Trait>; ranks: Record<string, Rank>; onPick: (i: Item) => void; target: string | null }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ItemKind>("completed");
  const list = items.filter((i) => i.kind === kind && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <input className="input !py-1 text-sm" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Item kind">
          {ITEM_KINDS.map((k) => (
            <button key={k.kind} type="button" className={`chip ${kind === k.kind ? "chip-active" : ""}`} aria-pressed={kind === k.kind} onClick={() => setKind(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-[0.7rem] text-dim">{target ? `Click an item to give it to ${target}, or drag it onto any unit.` : "Drag an item onto a unit, or select a unit first and click."}</p>
      <ul className="grid max-h-[32rem] grid-cols-1 gap-1 overflow-y-auto pr-1">
        {list.map((i) => (
          <li key={i.id}>
            <Hover content={<ItemCard i={i} components={components} traits={traits} />} side="left">
              <Pick id={`pick:item:${i.id}`} className="flex w-full cursor-grab items-center gap-2 border border-transparent p-1 text-left hover:border-[var(--gold-dim)] active:cursor-grabbing" onClick={() => onPick(i)}>
                <ItemIcon icon={i.icon} name={i.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-gold-bright">{i.name}</span>
                  <span className="line-clamp-1 text-[0.6rem] text-dim">{summarizeEffects(i)}</span>
                </span>
                <RankBadge rank={ranks[i.id]} size={14} />
              </Pick>
            </Hover>
          </li>
        ))}
      </ul>
    </div>
  );
}

function summarizeEffects(i: Item): string {
  const e = i.effects;
  const parts: string[] = [];
  if (e.AD) parts.push(`+${Math.round(e.AD * 100)}% AD`);
  if (e.AP) parts.push(`+${e.AP} AP`);
  if (e.AS) parts.push(`+${e.AS}% AS`);
  if (e.Health) parts.push(`+${e.Health} HP`);
  if (e.Armor) parts.push(`+${e.Armor} armor`);
  if (e.MagicResist) parts.push(`+${e.MagicResist} MR`);
  if (e.CritChance) parts.push(`+${e.CritChance}% crit`);
  if (e.ManaRegen) parts.push(`+${e.ManaRegen} mana/s`);
  return parts.length ? parts.join(" · ") : (i.desc.split("\n")[0] ?? "");
}

function AugmentPicker({ augments, chosen, ranks, onToggle }: { augments: Augment[]; chosen: string[]; ranks: Record<string, Rank>; onToggle: (a: Augment) => void }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<Augment["tier"] | "">("");
  const [tag, setTag] = useState<Tag | "">("");
  const tagged = useMemo(() => augments.map((a) => ({ a, tags: tagsFor(a) })), [augments]);
  const list = tagged.filter(({ a, tags }) => (!tier || a.tier === tier) && (!tag || tags.includes(tag)) && (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.desc.toLowerCase().includes(q.toLowerCase()))).slice(0, 120);
  const byId = useMemo(() => new Map(augments.map((a) => [a.id, a])), [augments]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {chosen.length === 0 ? <span className="text-[0.7rem] text-dim">No augments chosen (max 3).</span> : null}
        {chosen.map((id) => {
          const a = byId.get(id);
          if (!a) return null;
          return (
            <button key={id} type="button" className="flex items-center gap-1 border border-[var(--gold-dim)] px-1 py-0.5 text-xs hover:border-danger" onClick={() => onToggle(a)} title="Remove">
              <TierBadge tier={a.tier} />
              <span className="max-w-[9rem] truncate">{a.name}</span>
              <span aria-hidden>✕</span>
            </button>
          );
        })}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <input className="input !py-1 text-sm" placeholder="Search augments" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search augments" />
        <div className="flex gap-1" role="group" aria-label="Tier">
          {(["silver", "gold", "prismatic"] as const).map((t) => (
            <button key={t} type="button" className={`chip ${tier === t ? "chip-active" : ""}`} aria-pressed={tier === t} onClick={() => setTier(tier === t ? "" : t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          {TAGS.map((t) => (
            <button key={t} type="button" className={`chip ${tag === t ? "chip-active" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
              {TAG_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid max-h-[32rem] grid-cols-1 gap-1 overflow-y-auto pr-1">
        {list.map(({ a, tags }) => {
          const on = chosen.includes(a.id);
          return (
            <li key={a.id}>
              <button type="button" className={`flex w-full items-start gap-2 border p-1 text-left ${on ? "border-gold" : "border-transparent hover:border-[var(--gold-dim)]"}`} onClick={() => onToggle(a)} aria-pressed={on}>
                <span className="mt-0.5 block h-7 w-7 shrink-0 overflow-hidden border border-[var(--gold-dim)] bg-[var(--bg-raised)]">
                  {a.icon ? <Image src={asset(a.icon)} alt="" width={28} height={28} className="h-full w-full object-cover" unoptimized /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs text-gold-bright">{a.name}</span>
                    <TierBadge tier={a.tier} />
                    <RankBadge rank={ranks[a.id]} size={14} />
                    <TagChips tags={tags} size="xs" />
                  </span>
                  <span className="line-clamp-2 text-[0.6rem] text-dim">{a.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.length === 120 ? <p className="mt-1 text-[0.65rem] text-dim">Showing the first 120; narrow the search.</p> : null}
    </div>
  );
}

function Results({ result, champions, items }: { result: SimResult; champions: Record<string, Champion>; items: Record<string, ItemLookup> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result]);
  const n = result.runs;
  const bw = (result.blueWins / n) * 100;
  const rw = (result.redWins / n) * 100;
  const dw = (result.draws / n) * 100;
  const winner = bw > rw + 5 ? "blue" : rw > bw + 5 ? "red" : null;
  const units = [...result.units].sort((a, b) => b.damageDealt - a.damageDealt);
  const maxDmg = Math.max(1, ...units.map((u) => u.damageDealt));
  return (
    <div ref={ref} className="panel p-4" aria-live="polite">
      <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Result · {n} simulated fights</div>
      <h2 className="mt-1 text-xl">
        {winner === "blue" ? "Your board wins" : winner === "red" ? "The enemy wins" : "Too close to call"}
        <span className="ml-2 text-sm text-dim">{winner ? `${Math.round(winner === "blue" ? bw : rw)}% of the time` : `${Math.round(bw)}% – ${Math.round(rw)}%`}</span>
      </h2>
      <div className="mt-3 flex h-4 w-full overflow-hidden border border-[var(--gold-dim)]" role="img" aria-label={`Your board ${Math.round(bw)}%, enemy ${Math.round(rw)}%, draws ${Math.round(dw)}%`}>
        <span style={{ width: `${bw}%`, background: SIDE_COLOR.blue }} />
        <span style={{ width: `${dw}%`, background: "var(--gold-dim)" }} />
        <span style={{ width: `${rw}%`, background: SIDE_COLOR.red }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <span className="text-dim">Your board</span>
          <div className="text-lg tabular-nums" style={{ color: SIDE_COLOR.blue }}>
            {Math.round(bw)}%
          </div>
          <div className="text-dim">
            {result.avgBlueSurvivors.toFixed(1)} survivors on average ({result.avgBlueSurvivorStars.toFixed(1)} stars)
          </div>
        </div>
        <div>
          <span className="text-dim">Enemy</span>
          <div className="text-lg tabular-nums" style={{ color: SIDE_COLOR.red }}>
            {Math.round(rw)}%
          </div>
          <div className="text-dim">
            {result.avgRedSurvivors.toFixed(1)} survivors on average ({result.avgRedSurvivorStars.toFixed(1)} stars)
          </div>
        </div>
        <div>
          <span className="text-dim">Fight length</span>
          <div className="text-lg tabular-nums text-gold-bright">{result.avgDuration.toFixed(1)}s</div>
          <div className="text-dim">{dw > 0 ? `${Math.round(dw)}% draws` : "no draws"}</div>
        </div>
      </div>

      <div className="table-wrap mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Damage dealt</th>
              <th className="num">Taken</th>
              <th className="num">Healed</th>
              <th className="num">Casts</th>
              <th className="num">Kills</th>
              <th className="num">Survives</th>
              <th className="num">Alive</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const c = champions[u.championId];
              return (
                <tr key={u.key}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 shrink-0" style={{ background: SIDE_COLOR[u.side] }} aria-label={SIDE_LABEL[u.side]} />
                      {c ? <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={22} /> : null}
                      <span className="whitespace-nowrap">
                        {u.name} {"★".repeat(u.star)}
                      </span>
                      <span className="flex gap-px">
                        {u.items.map((id, i) => (
                          <ItemIcon key={i} icon={items[id]?.icon ?? ""} name={items[id]?.name ?? id} size={14} />
                        ))}
                      </span>
                    </span>
                  </td>
                  <td className="min-w-[8rem]">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2 grow bg-[var(--bg-deep)]">
                        <span className="block h-full" style={{ width: `${(u.damageDealt / maxDmg) * 100}%`, background: SIDE_COLOR[u.side] }} />
                      </span>
                      <span className="w-12 text-right tabular-nums">{Math.round(u.damageDealt)}</span>
                    </span>
                  </td>
                  <td className="num">{Math.round(u.damageTaken)}</td>
                  <td className="num">{Math.round(u.healing)}</td>
                  <td className="num">{u.casts.toFixed(1)}</td>
                  <td className="num">{u.kills.toFixed(1)}</td>
                  <td className="num">{Math.round(u.survived * 100)}%</td>
                  <td className="num">{u.avgTimeAlive.toFixed(1)}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 text-[0.7rem] text-dim md:grid-cols-2">
        {(["blue", "red"] as Side[]).map((s) => (
          <div key={s}>
            <span className="display uppercase tracking-wider" style={{ color: SIDE_COLOR[s] }}>
              {SIDE_LABEL[s]} modelled as
            </span>
            <div>Traits: {result.notes[s].traits.filter((t) => t.reached > 0).map((t) => `${t.name} ${t.count} (${t.style})`).join(", ") || "none active"}</div>
            {result.notes[s].augments.length ? <div>Augments: {result.notes[s].augments.map((a) => `${a.name}: ${a.note}`).join("; ")}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
