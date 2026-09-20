"use client";

/**
 * The TFT board.
 *
 * Geometry: 4 rows × 7 columns per player, pointy-top hexagons, odd-r offset
 * (odd display rows shift right by half a hex; vertical step 0.75 × hex
 * height). Coordinates { row: 0..3, col: 0..6 }: row 0 is the FRONTLINE
 * (nearest the enemy), row 3 the BACKLINE. Every scenario file depends on this.
 *
 * Modes: "own" (4 rows) or "versus" (enemy board mirrored above a divider).
 * `readonly` disables all interaction; otherwise units can be moved with
 * drag-and-drop (@dnd-kit) or the keyboard: Tab to the board, arrows move the
 * cursor between hexes (and down into the bench), Enter picks up / drops,
 * Escape cancels a pick-up.
 *
 * Size is driven by --hex-size, which the container sets from its own width
 * (container query) so the board never overflows, down to 360px viewports.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { BenchUnit, PlacedUnit } from "@/lib/scenario-schema";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { COLS, ROWS, boardSize, displayCoord, hexKey, hexLabel, hexOffset, sameHex, type HexCoord } from "@/lib/hex";
import { UnitToken } from "./UnitToken";
import { BoardChrome, type BoardStatus } from "./BoardChrome";

export interface BoardProps {
  mode?: "own" | "versus";
  readonly?: boolean;
  board: PlacedUnit[];
  enemyBoard?: PlacedUnit[];
  bench?: BenchUnit[];
  shop?: (string | null)[];
  status?: BoardStatus;
  items?: Record<string, ItemLookup>;
  units: Record<string, UnitLookup>;
  traitNames?: Record<string, string>;
  /** Hexes to outline (e.g. the correct answer after grading). */
  highlight?: HexCoord[];
  highlightColor?: string;
  /** Called after every move in editable mode. */
  onChange?: (next: { board: PlacedUnit[]; bench: BenchUnit[] }) => void;
  /** Show bench/shop/status. */
  chrome?: boolean;
  className?: string;
  /** Max hex width in px. */
  maxHex?: number;
}

type Cursor = { area: "board"; hex: HexCoord } | { area: "bench"; slot: number };
type Held = { from: Cursor; unit: PlacedUnit | BenchUnit } | null;

function benchWithSlots(bench: BenchUnit[]): (BenchUnit | null)[] {
  const slots: (BenchUnit | null)[] = Array.from({ length: 9 }, () => null);
  let next = 0;
  for (const u of bench) {
    let s = u.slot ?? -1;
    if (s < 0 || slots[s]) {
      while (next < 9 && slots[next]) next++;
      s = next;
    }
    if (s < 9) slots[s] = { ...u, slot: s };
  }
  return slots;
}

export function Board({
  mode = "own",
  readonly = false,
  board,
  enemyBoard = [],
  bench = [],
  shop,
  status,
  items = {},
  units,
  traitNames,
  highlight = [],
  highlightColor = "var(--teal)",
  onChange,
  chrome = true,
  className = "",
  maxHex = 60,
}: BoardProps) {
  const rows = mode === "versus" ? ROWS * 2 : ROWS;
  const size = boardSize(rows);
  const benchSlots = useMemo(() => benchWithSlots(bench), [bench]);

  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [held, setHeld] = useState<Held>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [announce, setAnnounce] = useState("");

  const unitAt = useCallback((h: HexCoord) => board.find((u) => u.row === h.row && u.col === h.col), [board]);

  const commit = useCallback(
    (from: Cursor, to: Cursor) => {
      if (readonly || !onChange) return;
      const nb = board.map((u) => ({ ...u }));
      const nbench = benchWithSlots(bench).map((u) => (u ? { ...u } : null));
      const take = (c: Cursor): PlacedUnit | BenchUnit | null => {
        if (c.area === "board") {
          const i = nb.findIndex((u) => u.row === c.hex.row && u.col === c.hex.col);
          return i >= 0 ? nb.splice(i, 1)[0]! : null;
        }
        const u = nbench[c.slot];
        nbench[c.slot] = null;
        return u;
      };
      const put = (c: Cursor, u: PlacedUnit | BenchUnit | null) => {
        if (!u) return;
        if (c.area === "board") {
          nb.push({ championId: u.championId, star: u.star, items: u.items, row: c.hex.row, col: c.hex.col });
        } else {
          nbench[c.slot] = { championId: u.championId, star: u.star, items: u.items, slot: c.slot };
        }
      };
      const a = take(from);
      if (!a) return;
      const b = take(to);
      put(to, a);
      put(from, b);
      onChange({ board: nb, bench: nbench.filter((u): u is BenchUnit => !!u) });
    },
    [board, bench, onChange, readonly],
  );

  // ---- keyboard --------------------------------------------------------------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readonly) return;
    const cur = cursor ?? { area: "board" as const, hex: { row: 3, col: 3 } };
    const move = (dr: number, dc: number) => {
      if (cur.area === "board") {
        let { row, col } = cur.hex;
        row += dr;
        col += dc;
        if (row >= ROWS && chrome) {
          setCursor({ area: "bench", slot: Math.min(8, Math.max(0, col)) });
          return;
        }
        row = Math.max(0, Math.min(ROWS - 1, row));
        col = Math.max(0, Math.min(COLS - 1, col));
        setCursor({ area: "board", hex: { row, col } });
      } else {
        if (dr < 0) {
          setCursor({ area: "board", hex: { row: ROWS - 1, col: Math.min(COLS - 1, cur.slot) } });
          return;
        }
        setCursor({ area: "bench", slot: Math.max(0, Math.min(8, cur.slot + dc)) });
      }
    };
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        move(-1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1, 0);
        break;
      case "ArrowLeft":
        e.preventDefault();
        move(0, -1);
        break;
      case "ArrowRight":
        e.preventDefault();
        move(0, 1);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        if (!cursor) {
          setCursor(cur);
          return;
        }
        if (!held) {
          const u = cursor.area === "board" ? unitAt(cursor.hex) : benchSlots[cursor.slot];
          if (u) {
            setHeld({ from: cursor, unit: u });
            setAnnounce(`Picked up ${units[u.championId]?.name ?? u.championId}. Move with arrows, Enter to drop.`);
          }
        } else {
          commit(held.from, cursor);
          setAnnounce(`Dropped on ${cursor.area === "board" ? hexLabel(cursor.hex) : `bench slot ${cursor.slot + 1}`}.`);
          setHeld(null);
        }
        break;
      }
      case "Escape":
        if (held) {
          e.preventDefault();
          setHeld(null);
          setAnnounce("Cancelled.");
        }
        break;
    }
  };

  // ---- drag & drop ------------------------------------------------------------
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (!e.over) return;
    const from = parseId(String(e.active.id));
    const to = parseId(String(e.over.id));
    if (!from || !to) return;
    commit(from, to);
  };

  useEffect(() => {
    if (!cursor) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-cursor="${cursorId(cursor)}"]`);
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [cursor]);

  const hexes: { side: "own" | "enemy"; hex: HexCoord }[] = [];
  if (mode === "versus") for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) hexes.push({ side: "enemy", hex: { row: r, col: c } });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) hexes.push({ side: "own", hex: { row: r, col: c } });

  const heldId = held ? (held.from.area === "board" ? `board:${hexKey(held.from.hex)}` : `bench:${held.from.slot}`) : null;

  const content = (
    <div
      ref={rootRef}
      className={`tft-board ${className}`}
      style={
        {
          containerType: "inline-size",
          // hex width: fill the container, never above maxHex
          ["--hex-size" as string]: `min(${maxHex}px, calc((100cqw - 4px) / ${size.w}))`,
        } as React.CSSProperties
      }
    >
      <div
        role="grid"
        aria-label={mode === "versus" ? "Versus board: enemy above, yours below" : "Your board"}
        aria-rowcount={rows}
        aria-colcount={COLS}
        tabIndex={readonly ? -1 : 0}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (!cursor && !readonly) setCursor({ area: "board", hex: { row: 3, col: 3 } });
        }}
        className="relative mx-auto outline-none"
        style={{ width: `calc(var(--hex-size) * ${size.w})`, height: `calc(var(--hex-size) * ${size.h})` }}
      >
        {mode === "versus" ? (
          <div aria-hidden className="absolute left-0 right-0 z-10 h-px bg-gold opacity-60" style={{ top: `calc(var(--hex-size) * ${(hexOffset(4, 0).y + hexOffset(3, 0).y) / 2 + 0.577})` }} />
        ) : null}
        {hexes.map(({ side, hex }) => {
          const { drow, dcol } = displayCoord(side, hex, mode);
          const off = hexOffset(drow, dcol);
          const unit = side === "own" ? unitAt(hex) : enemyBoard.find((u) => u.row === hex.row && u.col === hex.col);
          const u = unit ? units[unit.championId] : undefined;
          const isCursor = cursor?.area === "board" && side === "own" && sameHex(cursor.hex, hex);
          const isHighlight = side === "own" && highlight.some((h) => sameHex(h, hex));
          const id = `board:${hexKey(hex)}`;
          return (
            <HexCell
              key={`${side}-${id}`}
              id={side === "own" ? id : `enemy:${hexKey(hex)}`}
              droppable={!readonly && side === "own"}
              style={{ left: `calc(var(--hex-size) * ${off.x})`, top: `calc(var(--hex-size) * ${off.y})` }}
              isCursor={isCursor}
              isHighlight={isHighlight}
              highlightColor={highlightColor}
              enemy={side === "enemy"}
              label={`${side === "enemy" ? "Enemy " : ""}${hexLabel(hex)}${u ? `: ${u.name}` : ", empty"}`}
              cursorId={side === "own" ? cursorId({ area: "board", hex }) : undefined}
              onClick={() => {
                if (readonly || side !== "own") return;
                const c: Cursor = { area: "board", hex };
                if (held) {
                  commit(held.from, c);
                  setHeld(null);
                }
                setCursor(c);
                rootRef.current?.querySelector<HTMLElement>('[role="grid"]')?.focus();
              }}
            >
              {unit && u ? (
                <Draggable id={side === "own" ? id : `enemy:${hexKey(hex)}`} disabled={readonly || side !== "own"} hidden={dragging === id || heldId === id}>
                  <UnitToken unit={u} star={unit.star} items={unit.items} itemLookup={items} traitNames={traitNames} dimmed={side === "enemy"} />
                </Draggable>
              ) : null}
            </HexCell>
          );
        })}
      </div>

      {chrome ? (
        <BoardChrome
          bench={benchSlots}
          shop={shop}
          status={status}
          units={units}
          items={items}
          traitNames={traitNames}
          readonly={readonly}
          cursorSlot={cursor?.area === "bench" ? cursor.slot : null}
          heldSlot={held?.from.area === "bench" ? held.from.slot : null}
          draggingId={dragging}
          onSlotClick={(slot) => {
            if (readonly) return;
            const c: Cursor = { area: "bench", slot };
            if (held) {
              commit(held.from, c);
              setHeld(null);
            }
            setCursor(c);
            rootRef.current?.querySelector<HTMLElement>('[role="grid"]')?.focus();
          }}
        />
      ) : null}
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
      {!readonly ? (
        <p className="mt-2 text-center text-[0.7rem] text-dim">
          Drag units, or Tab to the board and use arrow keys · Enter picks up / drops · Esc cancels
        </p>
      ) : null}
    </div>
  );

  if (readonly) return content;
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {content}
      <DragOverlay dropAnimation={null}>
        {dragging
          ? (() => {
              const c = parseId(dragging);
              const u = c ? (c.area === "board" ? unitAt(c.hex) : benchSlots[c.slot]) : null;
              const lk = u ? units[u.championId] : null;
              return u && lk ? (
                <div style={{ ["--hex-size" as string]: `${maxHex}px` }}>
                  <UnitToken unit={lk} star={u.star} items={u.items} itemLookup={items} />
                </div>
              ) : null;
            })()
          : null}
      </DragOverlay>
    </DndContext>
  );
}

function cursorId(c: Cursor): string {
  return c.area === "board" ? `board:${hexKey(c.hex)}` : `bench:${c.slot}`;
}

function parseId(id: string): Cursor | null {
  const [area, rest] = id.split(":");
  if (area === "board" && rest) {
    const [r, c] = rest.split(",").map(Number);
    return { area: "board", hex: { row: r!, col: c! } };
  }
  if (area === "bench" && rest) return { area: "bench", slot: Number(rest) };
  return null;
}

function HexCell({
  id,
  droppable,
  style,
  isCursor,
  isHighlight,
  highlightColor,
  enemy,
  label,
  cursorId,
  onClick,
  children,
}: {
  id: string;
  droppable: boolean;
  style: React.CSSProperties;
  isCursor: boolean;
  isHighlight: boolean;
  highlightColor: string;
  enemy: boolean;
  label: string;
  cursorId?: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });
  const ring = isCursor ? "var(--gold-bright)" : isHighlight ? highlightColor : isOver ? "var(--teal)" : "transparent";
  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={label}
      aria-selected={isCursor || undefined}
      data-cursor={cursorId}
      onClick={onClick}
      className="absolute"
      style={{ ...style, width: "var(--hex-size)", height: "calc(var(--hex-size) * 1.1547)", padding: "1.5px" }}
    >
      <div
        className="hex h-full w-full"
        style={{
          background: isHighlight ? highlightColor : isCursor ? "var(--gold)" : isOver ? "var(--teal)" : enemy ? "rgba(224,72,58,0.35)" : "rgba(200,170,110,0.35)",
        }}
      >
        <div
          className="hex flex h-full w-full items-center justify-center"
          style={{
            margin: 0,
            transform: "scale(0.93)",
            background: enemy
              ? "radial-gradient(circle at 50% 40%, #241418, #12090c)"
              : isHighlight
                ? "radial-gradient(circle at 50% 40%, #12302f, #0b1a1c)"
                : "radial-gradient(circle at 50% 40%, #16202e, #0b111a)",
            outline: isCursor ? `2px solid ${ring}` : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Draggable({ id, disabled, hidden, children }: { id: string; disabled: boolean; hidden: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, disabled });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} tabIndex={-1} className={`${disabled ? "" : "cursor-grab active:cursor-grabbing"} ${hidden ? "opacity-20" : ""}`} style={{ touchAction: "none" }}>
      {children}
    </div>
  );
}
