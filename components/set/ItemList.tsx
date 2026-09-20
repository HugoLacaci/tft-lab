"use client";

import { useState } from "react";
import type { ItemKind } from "@/lib/types";
import { Hover, ItemCard, itemStats, type ItemCardData, type ItemRef } from "./hovers";
import { ItemIcon, TraitIcon } from "./icons";
import { RichText } from "./RichText";
import { RankBadge } from "./RankBadge";
import type { Rank } from "@/lib/tiers";

const KINDS: { id: ItemKind; label: string }[] = [
  { id: "component", label: "Components" },
  { id: "completed", label: "Completed" },
  { id: "emblem", label: "Emblems" },
  { id: "artifact", label: "Artifacts" },
  { id: "radiant", label: "Radiant" },
  { id: "support", label: "Support" },
  { id: "other", label: "Other" },
];

const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

export function ItemList({
  items,
  components,
  traits,
  ranks = {},
  stats = {},
  patch = "",
  noEmblem = [],
}: {
  items: ItemCardData[];
  components: Record<string, ItemRef>;
  traits: Record<string, { id: string; name: string; icon: string }>;
  ranks?: Record<string, Rank>;
  /** average placement per item id from the meta sync */
  stats?: Record<string, { avg: number; games: number }>;
  patch?: string;
  noEmblem?: string[];
}) {
  const [kind, setKind] = useState<ItemKind>("completed");
  const [q, setQ] = useState("");
  const rankOf = (id: string) => (ranks[id] ? RANK_ORDER[ranks[id]!] : 9);
  const list = items
    .filter((i) => i.kind === kind && (!q || i.name.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => rankOf(a.id) - rankOf(b.id) || (stats[a.id]?.avg ?? 9) - (stats[b.id]?.avg ?? 9) || a.name.localeCompare(b.name));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search items" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Item kind">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={`chip ${kind === k.id ? "chip-active" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label} <span className="text-dim">{items.filter((i) => i.kind === k.id).length}</span>
            </button>
          ))}
        </div>
        <span className="text-xs text-dim">sorted by tier · hover a card for the full tooltip</span>
      </div>
      {kind === "other" ? <p className="mb-3 text-xs text-dim">“Other” holds consumables and armory entries CommunityDragon lists alongside items. Most are not shop items. Wisps have their own page.</p> : null}
      {kind === "emblem" && noEmblem.length ? <p className="mb-3 text-xs text-dim">Every emblem in the game files is listed. Traits without a craftable emblem this set: {noEmblem.join(", ")}.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => {
          const statLines = itemStats(i.effects);
          return (
            <li key={i.id}>
              <Hover delay={500} content={<ItemCard i={i} components={components} traits={traits} rank={ranks[i.id]} stat={stats[i.id] ? { ...stats[i.id]!, patch } : undefined} />}>
                <div className="panel flex h-full gap-3 p-3" tabIndex={0}>
                  <ItemIcon icon={i.icon} name={i.name} size={40} />
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2 text-gold-bright">
                      {i.name}
                      <RankBadge rank={ranks[i.id]} size={16} />
                      {stats[i.id] ? (
                        <span className="text-[0.65rem] text-dim" title={`Average placement over ${stats[i.id]!.games} top-ladder boards`}>
                          avg {stats[i.id]!.avg.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                    {i.composition.length ? (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-dim">
                        {i.composition.map((c, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1">
                            {idx > 0 ? <span aria-hidden>+</span> : null}
                            <ItemIcon icon={components[c]?.icon ?? ""} name={components[c]?.name ?? c} size={16} />
                          </span>
                        ))}
                        <span className="ml-1">{i.composition.map((c) => components[c]?.name ?? c).join(" + ")}</span>
                      </div>
                    ) : null}
                    {i.kind === "emblem" && i.associatedTraits[0] ? (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-gold">
                        <TraitIcon icon={traits[i.associatedTraits[0]]?.icon ?? ""} name={traits[i.associatedTraits[0]]?.name ?? ""} size={12} />
                        {traits[i.associatedTraits[0]]?.name}
                      </div>
                    ) : null}
                    {statLines.length ? (
                      <div className="mt-1 flex flex-wrap gap-x-2 text-[0.68rem]">
                        {statLines.map((s, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1">
                            <RichText text={`[[${s.k}]]`} />
                            <span className="text-gold-bright">{s.v}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {i.desc ? (
                      <p className="mt-1 line-clamp-3 text-xs text-dim">
                        <RichText text={i.rich || i.desc} />
                      </p>
                    ) : null}
                  </div>
                </div>
              </Hover>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
