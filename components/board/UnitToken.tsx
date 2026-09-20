"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import * as Tooltip from "@radix-ui/react-tooltip";
import { costColor } from "@/lib/costs";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";

export interface TokenProps {
  unit: UnitLookup;
  star: 1 | 2 | 3;
  items: string[];
  itemLookup: Record<string, ItemLookup>;
  traitNames?: Record<string, string>;
  /** fraction of --hex-size */
  scale?: number;
  dimmed?: boolean;
  showTraitChevron?: boolean;
}

const STAR_COLOR: Record<1 | 2 | 3, string> = { 1: "#b08a4a", 2: "#c8d0d8", 3: "#ffb642" };

/** Stars follow the top edges of the hexagon: fanned around the top vertex, just outside the art. */
function Stars({ star }: { star: 1 | 2 | 3 }) {
  const step = 26; // degrees between stars
  const r = 0.58; // of token size
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: star }).map((_, i) => {
        const deg = -90 + (i - (star - 1) / 2) * step;
        const rad = (deg * Math.PI) / 180;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${(Math.cos(rad) * r * 100).toFixed(1)}%)`,
              top: `calc(50% + ${(Math.sin(rad) * r * 100).toFixed(1)}%)`,
              width: "calc(var(--hex-size) * 0.17)",
              height: "calc(var(--hex-size) * 0.17)",
              transform: "translate(-50%, -50%)",
              clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              background: STAR_COLOR[star],
              filter: star === 3 ? "drop-shadow(0 0 3px rgba(255,182,66,0.9))" : "drop-shadow(0 1px 1px rgba(0,0,0,0.7))",
            }}
          />
        );
      })}
    </span>
  );
}

export function UnitToken({ unit, star, items, itemLookup, traitNames, scale = 0.72, dimmed, showTraitChevron }: TokenProps) {
  const ring = costColor(unit.cost);
  const its = items.map((id) => itemLookup[id]).filter((x): x is ItemLookup => !!x);
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={`relative block select-none ${dimmed ? "opacity-50" : ""}`}
            style={{ width: `calc(var(--hex-size) * ${scale})`, height: `calc(var(--hex-size) * ${scale})` }}
            aria-label={`${unit.name}, ${star} star, ${unit.cost} cost${its.length ? `, items: ${its.map((i) => i.name).join(", ")}` : ""}`}
          >
            <span className="hex flex h-full w-full items-center justify-center" style={{ background: ring, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
              <span className="hex block h-[88%] w-[88%] overflow-hidden bg-[var(--bg-raised)]">
                <Image src={asset(unit.icon)} alt="" width={64} height={64} className="object-cover" style={{ width: "100%", height: "100%" }} unoptimized loading="eager" draggable={false} />
              </span>
            </span>
            <Stars star={star} />
            {showTraitChevron && unit.traits.length ? (
              <span aria-hidden className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[var(--bg-deep)]" />
            ) : null}
            {its.length ? (
              <span className="pointer-events-none absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-[45%] gap-px" aria-hidden>
                {its.map((i, idx) => (
                  <span key={idx} className="hex block overflow-hidden bg-[var(--gold-dim)] p-px" style={{ width: "calc(var(--hex-size) * 0.22)", height: "calc(var(--hex-size) * 0.254)" }}>
                    <Image src={asset(i.icon)} alt="" width={24} height={24} className="object-cover" style={{ width: "100%", height: "100%" }} unoptimized loading="eager" draggable={false} />
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} className="panel z-50 max-w-xs p-3 text-xs shadow-xl">
            <div className="flex items-center gap-2">
              <span className="display text-sm text-gold-bright">{unit.name}</span>
              <span className="display text-[0.65rem] font-bold" style={{ color: ring }}>
                {unit.cost}-cost · {star}★
              </span>
            </div>
            {unit.traits.length ? <div className="mt-1 text-gold">{unit.traits.map((t) => traitNames?.[t] ?? t).join(" · ")}</div> : null}
            {unit.ability?.name ? (
              <div className="mt-2">
                <div className="font-semibold text-gold-bright">{unit.ability.name}</div>
                <p className="mt-0.5 line-clamp-6 whitespace-pre-line text-dim">{unit.ability.desc}</p>
              </div>
            ) : null}
            {its.length ? <div className="mt-2 text-dim">Items: {its.map((i) => i.name).join(", ")}</div> : null}
            <Tooltip.Arrow className="fill-[var(--gold-dim)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
