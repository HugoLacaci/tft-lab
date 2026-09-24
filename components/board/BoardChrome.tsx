"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { BenchUnit } from "@/lib/scenario-schema";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { costColor } from "@/lib/costs";
import { UnitToken } from "./UnitToken";
import { StatIcon } from "@/components/set/StatIcon";

export interface BoardStatus {
  gold: number;
  hp: number;
  level: number;
  xpToNext: number;
  xpNeeded?: number;
  stage: string;
  streak: { type: "win" | "loss"; count: number };
  items?: string[];
}

export function BoardChrome({
  bench,
  shop,
  status,
  units,
  items,
  traitNames,
  readonly,
  cursorSlot,
  heldSlot,
  draggingId,
  onSlotClick,
}: {
  bench: (BenchUnit | null)[];
  shop?: (string | null)[];
  status?: BoardStatus;
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames?: Record<string, string>;
  readonly: boolean;
  cursorSlot: number | null;
  heldSlot: number | null;
  draggingId: string | null;
  onSlotClick: (slot: number) => void;
}) {
  return (
    <div className="mx-auto mt-3 space-y-3" style={{ width: "calc(var(--hex-size) * 7.5)", maxWidth: "100%" }}>
      {status ? <StatusBar status={status} items={items} /> : null}

      <div>
        <div className="display mb-1 text-[0.6rem] uppercase tracking-[0.2em] text-dim">Bench</div>
        <div className="grid grid-cols-9 gap-1">
          {bench.map((u, slot) => (
            <BenchSlot key={slot} slot={slot} readonly={readonly} isCursor={cursorSlot === slot} onClick={() => onSlotClick(slot)}>
              {u && units[u.championId] ? (
                <BenchDraggable id={`bench:${slot}`} disabled={readonly} hidden={draggingId === `bench:${slot}` || heldSlot === slot}>
                  <UnitToken unit={units[u.championId]!} star={u.star} items={u.items} itemLookup={items} traitNames={traitNames} scale={0.6} />
                </BenchDraggable>
              ) : null}
            </BenchSlot>
          ))}
        </div>
      </div>

      {shop ? (
        <div>
          <div className="display mb-1 text-[0.6rem] uppercase tracking-[0.2em] text-dim">Shop</div>
          <div className="grid grid-cols-5 gap-1">
            {shop.map((id, i) => {
              const u = id ? units[id] : null;
              return (
                <div key={i} className="notch flex items-center gap-1.5 border border-[var(--gold-dim)] bg-[var(--bg-panel)] p-1" style={{ minHeight: "calc(var(--hex-size) * 0.9)" }}>
                  {u ? (
                    <>
                      <span className="hex flex shrink-0 items-center justify-center" style={{ width: "calc(var(--hex-size) * 0.5)", height: "calc(var(--hex-size) * 0.577)", background: costColor(u.cost) }}>
                        <span className="hex block h-[88%] w-[88%] overflow-hidden">
                          <Image src={asset(u.icon)} alt="" width={32} height={32} className="h-full w-full object-cover" unoptimized loading="eager" />
                        </span>
                      </span>
                      <span className="min-w-0 text-[0.62rem] leading-tight">
                        <span className="block truncate text-gold-bright">{u.name}</span>
                        <span style={{ color: costColor(u.cost) }}>{u.cost}g</span>
                      </span>
                    </>
                  ) : (
                    <span className="w-full text-center text-[0.6rem] text-dim">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBar({ status, items }: { status: BoardStatus; items: Record<string, ItemLookup> }) {
  const hpColor = status.hp > 60 ? "var(--teal)" : status.hp > 30 ? "var(--gold)" : "var(--red)";
  const its = (status.items ?? []).map((id) => items[id]).filter((x): x is ItemLookup => !!x);
  return (
    <div className="panel flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
      <Stat label="Stage" value={status.stage} />
      <span className="flex items-center gap-1.5">
        <span className="display inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-wider text-dim">
          <StatIcon stat="Gold" size="0.9rem" />
          Gold
        </span>
        <span className="font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
          {status.gold}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="display inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-wider text-dim">
          <StatIcon stat="HP" size="0.9rem" title="Player health" />
          HP
        </span>
        <span className="relative inline-block h-2 w-16 bg-[var(--bg-deep)]" aria-hidden>
          <span className="absolute inset-y-0 left-0" style={{ width: `${status.hp}%`, background: hpColor }} />
        </span>
        <span className="font-semibold tabular-nums" style={{ color: hpColor }}>
          {status.hp}
        </span>
      </span>
      <Stat label="Lvl" value={`${status.level}`} />
      <Stat label="XP" value={status.xpNeeded ? `${status.xpNeeded - status.xpToNext}/${status.xpNeeded}` : `${status.xpToNext} to next`} />
      <Stat label="Streak" value={`${status.streak.type === "win" ? "W" : "L"}${status.streak.count}`} color={status.streak.type === "win" ? "var(--teal)" : "var(--red)"} />
      {its.length ? (
        <span className="ml-auto flex items-center gap-1">
          <span className="display text-[0.6rem] uppercase tracking-wider text-dim">Items</span>
          {its.map((i, idx) => (
            <span key={idx} className="block h-5 w-5 overflow-hidden border border-[var(--gold-dim)]" title={i.name}>
              <Image src={asset(i.icon)} alt={i.name} width={20} height={20} className="h-full w-full object-cover" unoptimized loading="eager" />
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="display text-[0.6rem] uppercase tracking-wider text-dim">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: color ?? "var(--gold-bright)" }}>
        {value}
      </span>
    </span>
  );
}

function BenchSlot({ slot, readonly, isCursor, onClick, children }: { slot: number; readonly: boolean; isCursor: boolean; onClick: () => void; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `bench:${slot}`, disabled: readonly });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={-1}
      aria-label={`Bench slot ${slot + 1}`}
      data-cursor={`bench:${slot}`}
      onClick={onClick}
      className="notch flex items-center justify-center bg-[var(--bg-panel)]"
      style={{
        aspectRatio: "1 / 1",
        border: `1px solid ${isCursor ? "var(--gold-bright)" : isOver ? "var(--teal)" : "var(--gold-dim)"}`,
        outline: isCursor ? "2px solid var(--gold-bright)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function BenchDraggable({ id, disabled, hidden, children }: { id: string; disabled: boolean; hidden: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, disabled });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} tabIndex={-1} className={`${disabled ? "" : "cursor-grab"} ${hidden ? "opacity-20" : ""}`} style={{ touchAction: "none" }}>
      {children}
    </div>
  );
}
