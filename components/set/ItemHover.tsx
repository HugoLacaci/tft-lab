"use client";

import type { ReactNode } from "react";
import type { Rank } from "@/lib/tiers";
import { Hover, ItemCard, type ItemCardData, type ItemRef } from "./hovers";

/** Wraps any element with the item hover card (0.5 s). Usable from server components. */
export function ItemHover({ item, components, rank, stat, children }: { item: ItemCardData; components: Record<string, ItemRef>; rank?: Rank; stat?: { avg: number; games: number; patch: string }; children: ReactNode }) {
  return (
    <Hover delay={500} content={<ItemCard i={item} components={components} rank={rank} stat={stat} />} side="top">
      <span className="inline-flex cursor-help" tabIndex={0}>
        {children}
      </span>
    </Hover>
  );
}
