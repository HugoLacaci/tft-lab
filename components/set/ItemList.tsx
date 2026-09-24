"use client";

import { Fragment, useMemo, useState } from "react";
import type { ItemKind } from "@/lib/types";
import { itemRole, ROLE_LABEL, ROLE_ORDER } from "@/lib/item-roles";
import { EMBLEM_GROUP_LABEL, emblemGroup, type TraitKind } from "@/lib/trait-kinds";
import { Hover, ItemCard, itemStats, StatValue, type ItemCardData, type ItemRef } from "./hovers";
import { ItemIcon, TraitIcon } from "./icons";
import { RichText } from "./RichText";
import { RankBadge } from "./RankBadge";
import type { Rank } from "@/lib/tiers";

const KINDS: { id: ItemKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "component", label: "Components" },
  { id: "completed", label: "Completed" },
  { id: "emblem", label: "Emblems" },
  { id: "artifact", label: "Artifacts" },
  { id: "radiant", label: "Radiant" },
  { id: "support", label: "Support" },
  { id: "other", label: "Other" },
];
const KIND_INDEX = Object.fromEntries(KINDS.map((k, i) => [k.id, i])) as Record<string, number>;
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<string, string>;

const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

type Sort = "type" | "tier" | "name-asc" | "name-desc";
const SORTS: { id: Sort; label: string }[] = [
  { id: "type", label: "Type" },
  { id: "tier", label: "Tier" },
  { id: "name-asc", label: "Name A → Z" },
  { id: "name-desc", label: "Name Z → A" },
];

export function ItemList({
  items,
  components,
  traits,
  traitKinds = {},
  ranks = {},
  stats = {},
  patch = "",
  noEmblem = [],
}: {
  items: ItemCardData[];
  components: Record<string, ItemRef>;
  traits: Record<string, { id: string; name: string; icon: string }>;
  /** origin / class per trait id, for the emblem order (see lib/trait-kinds) */
  traitKinds?: Record<string, TraitKind>;
  ranks?: Record<string, Rank>;
  /** average placement per item id from the meta sync */
  stats?: Record<string, { avg: number; games: number }>;
  patch?: string;
  noEmblem?: string[];
}) {
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [sort, setSort] = useState<Sort>("type");
  const [q, setQ] = useState("");

  /** Type bucket per item: emblems by origin/class and craftability, everything else by role. */
  const typed = useMemo(() => {
    const componentName = (id: string) => components[id]?.name;
    return items.map((i) => {
      if (i.kind === "emblem") {
        const g = emblemGroup(i, traitKinds);
        return { i, order: g, group: EMBLEM_GROUP_LABEL[g] };
      }
      const role = itemRole(i, componentName);
      return { i, order: ROLE_ORDER.indexOf(role), group: ROLE_LABEL[role] };
    });
  }, [items, components, traitKinds]);

  const rankOf = (id: string) => (ranks[id] ? RANK_ORDER[ranks[id]!] : 9);
  const byTier = (a: ItemCardData, b: ItemCardData) => rankOf(a.id) - rankOf(b.id) || (stats[a.id]?.avg ?? 9) - (stats[b.id]?.avg ?? 9) || a.name.localeCompare(b.name);
  const list = typed
    .filter(({ i }) => (kind === "all" || i.kind === kind) && (!q || i.name.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      if (sort === "name-asc") return a.i.name.localeCompare(b.i.name);
      if (sort === "name-desc") return b.i.name.localeCompare(a.i.name);
      const byKind = kind === "all" ? KIND_INDEX[a.i.kind]! - KIND_INDEX[b.i.kind]! : 0;
      if (sort === "tier") return byKind || byTier(a.i, b.i);
      return byKind || a.order - b.order || byTier(a.i, b.i);
    });
  const groupOf = (t: (typeof typed)[number]) => (kind === "all" ? `${KIND_LABEL[t.i.kind]} · ${t.group}` : t.group);
  const count = (k: ItemKind | "all") => (k === "all" ? items.length : items.filter((i) => i.kind === k).length);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search items" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Item kind">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={`chip ${kind === k.id ? "chip-active" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label} <span className="text-dim">{count(k.id)}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-dim">
          Sort
          <select className="input w-auto !py-1" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort items">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-dim">{list.length} shown · hover a card for the full tooltip</span>
      </div>
      {kind === "other" ? <p className="mb-3 text-xs text-dim">“Other” holds consumables and armory entries CommunityDragon lists alongside items. Most are not shop items. Wisps have their own page.</p> : null}
      {kind === "emblem" && noEmblem.length ? <p className="mb-3 text-xs text-dim">Every emblem in the game files is listed. Traits without a craftable emblem this set: {noEmblem.join(", ")}.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, idx) => {
          const i = t.i;
          const statLines = itemStats(i.effects);
          const group = groupOf(t);
          const header = sort === "type" && (idx === 0 || groupOf(list[idx - 1]!) !== group);
          return (
            <Fragment key={i.id}>
              {header ? (
                <li className="col-span-full mt-2 flex items-center gap-2 first:mt-0" aria-hidden>
                  <span className="display text-[0.68rem] uppercase tracking-[0.2em] text-gold">{group}</span>
                  <span className="h-px flex-1 bg-[var(--gold-dim)]" />
                </li>
              ) : null}
              <li>
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
                      {kind === "all" || sort !== "type" ? <div className="text-[0.6rem] uppercase tracking-wider text-dim">{kind === "all" ? `${KIND_LABEL[i.kind]} · ` : ""}{t.group}</div> : null}
                      {i.composition.length ? (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-dim">
                          {i.composition.map((c, idx2) => (
                            <span key={idx2} className="inline-flex items-center gap-1">
                              {idx2 > 0 ? <span aria-hidden>+</span> : null}
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
                          {traitKinds[i.associatedTraits[0]] ? <span className="text-[0.6rem] uppercase tracking-wider text-dim">· {traitKinds[i.associatedTraits[0]]}</span> : null}
                        </div>
                      ) : null}
                      {statLines.length ? (
                        <div className="mt-1 flex flex-wrap gap-x-2 text-[0.68rem]">
                          {statLines.map((s, idx2) => (
                            <StatValue key={idx2} stat={s.k} value={s.v} />
                          ))}
                        </div>
                      ) : null}
                      {i.desc ? (
                        <p className="mt-1 line-clamp-3 text-xs text-dim">
                          <RichText text={i.rich || i.desc} words />
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Hover>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
