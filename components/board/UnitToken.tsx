"use client";

import Image from "next/image";
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

function Stars({ star }: { star: 1 | 2 | 3 }) {
  const gold = star === 3;
  return (
    <span className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[85%] gap-px" aria-hidden>
      {Array.from({ length: star }).map((_, i) => (
        <span
          key={i}
          className={gold ? "prismatic" : ""}
          style={{
            display: "inline-block",
            width: "calc(var(--hex-size) * 0.16)",
            height: "calc(var(--hex-size) * 0.16)",
            clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            background: gold ? undefined : star === 2 ? "#c0c8d0" : "#b08a4a",
          }}
        />
      ))}
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
            <Stars star={star} />
            <span className="block h-full w-full overflow-hidden rounded-full bg-[var(--bg-raised)]" style={{ boxShadow: `0 0 0 2px ${ring}, 0 2px 6px rgba(0,0,0,0.6)` }}>
              <Image src={unit.icon} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized loading="eager" draggable={false} />
            </span>
            {showTraitChevron && unit.traits.length ? (
              <span aria-hidden className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[var(--bg-deep)]" />
            ) : null}
            {its.length ? (
              <span className="pointer-events-none absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-[35%] gap-px" aria-hidden>
                {its.map((i, idx) => (
                  <span key={idx} className="block overflow-hidden border border-[var(--gold-dim)] bg-[var(--bg-deep)]" style={{ width: "calc(var(--hex-size) * 0.22)", height: "calc(var(--hex-size) * 0.22)" }}>
                    <Image src={i.icon} alt="" width={24} height={24} className="h-full w-full object-cover" unoptimized loading="eager" draggable={false} />
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
            {unit.traits.length ? (
              <div className="mt-1 text-gold">{unit.traits.map((t) => traitNames?.[t] ?? t).join(" · ")}</div>
            ) : null}
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
