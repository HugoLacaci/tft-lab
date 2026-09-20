"use client";

import { useMemo, useState } from "react";
import { TAG_LABEL, TAGS, type Tag } from "@/lib/tags";
import type { Item } from "@/lib/types";
import { TagChips, tagsFor } from "./hovers";
import { ItemIcon } from "./icons";
import { RichText } from "./RichText";
import { RankBadge } from "./RankBadge";
import type { Rank } from "@/lib/tiers";

export type WispData = Pick<Item, "id" | "name" | "desc" | "rich" | "icon" | "effects"> & { cost: number | null; stage?: string | null; upgrade: boolean; rank?: Rank };
const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

function effectList(e: Record<string, number>): string {
  return Object.entries(e)
    .filter(([k]) => !/^\d/.test(k))
    .map(([k, v]) => `${k.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${v}`)
    .join(" · ");
}

type Sort = "tier" | "name" | "cost-asc" | "cost-desc";

export function WispList({ wisps, known }: { wisps: WispData[]; known: number }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<Tag | "">("");
  const [sort, setSort] = useState<Sort>("tier");
  const [showUpgrades, setShowUpgrades] = useState(false);
  const tagged = useMemo(() => wisps.map((c) => ({ c, tags: tagsFor({ name: c.name, desc: c.desc }) })), [wisps]);
  const list = tagged
    .filter(({ c, tags }) => (showUpgrades || !c.upgrade) && (!tag || tags.includes(tag)) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.desc.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      if (sort === "name") return a.c.name.localeCompare(b.c.name);
      if (sort === "tier") return (a.c.rank ? RANK_ORDER[a.c.rank] : 9) - (b.c.rank ? RANK_ORDER[b.c.rank] : 9) || (a.c.cost ?? 99) - (b.c.cost ?? 99) || a.c.name.localeCompare(b.c.name);
      const ca = a.c.cost ?? Infinity;
      const cb = b.c.cost ?? Infinity;
      if (ca === cb) return a.c.name.localeCompare(b.c.name);
      if (!Number.isFinite(ca)) return 1;
      if (!Number.isFinite(cb)) return -1;
      return sort === "cost-asc" ? ca - cb : cb - ca;
    });
  const count = (t: Tag) => tagged.filter((x) => x.tags.includes(t) && (showUpgrades || !x.c.upgrade)).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search wisps" aria-label="Search wisps" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          {TAGS.map((t) => (
            <button key={t} type="button" className={`chip ${tag === t ? "chip-active" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
              {TAG_LABEL[t]} <span className="text-dim">{count(t)}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-dim">
          Sort
          <select className="input w-auto !py-1" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort wisps">
            <option value="tier">Tier</option>
            <option value="cost-asc">Cost ↑</option>
            <option value="cost-desc">Cost ↓</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-dim">
          <input type="checkbox" checked={showUpgrades} onChange={(e) => setShowUpgrades(e.target.checked)} /> Show upgraded versions
        </label>
        <span className="text-xs text-dim">
          {list.length} shown · cost known for {known}
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ c, tags }) => (
          <li key={c.id} className="panel flex gap-3 p-3">
            <div className="flex flex-col items-center gap-1">
              <ItemIcon icon={c.icon} name={c.name} size={40} />
              <span className="display text-[0.7rem] font-bold tabular-nums" style={{ color: c.cost === null ? "var(--text-dim)" : "var(--gold)" }} title={c.cost === null ? "Cost not published" : `Gold cost${c.stage ? ` · appears ${c.stage}` : ""}`}>
                {c.cost === null ? "?g" : `${c.cost}g`}
              </span>
              {c.stage ? <span className="text-center text-[0.55rem] leading-tight text-dim">{c.stage}</span> : null}
            </div>
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gold-bright">{c.name}</span>
                <RankBadge rank={c.rank} size={16} />
                {c.upgrade ? <span className="display text-[0.6rem] uppercase tracking-wider text-gold">upgraded</span> : null}
              </div>
              <div className="mt-1">
                <TagChips tags={tags} size="xs" />
              </div>
              <p className="mt-1 text-xs text-ink">
                <RichText text={c.rich || c.desc} />
              </p>
              {Object.keys(c.effects).length ? <p className="mt-1 text-[0.65rem] text-dim">{effectList(c.effects)}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
