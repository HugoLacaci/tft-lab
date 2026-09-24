"use client";

import { useMemo, useState } from "react";
import { TAG_LABEL, TAGS, type Tag } from "@/lib/tags";
import type { Augment, AugmentTier } from "@/lib/types";
import { TagChips, tagsFor } from "./hovers";
import { ItemIcon, TierBadge } from "./icons";
import { RankBadge } from "./RankBadge";
import { RichText } from "./RichText";
import type { Rank } from "@/lib/tiers";

const TIERS: AugmentTier[] = ["silver", "gold", "prismatic"];
const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

export function AugmentList({ augments, traits, ranks = {} }: { augments: Augment[]; traits: { id: string; name: string }[]; ranks?: Record<string, Rank> }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<AugmentTier | "">("");
  const [tag, setTag] = useState<Tag | "">("");
  const [trait, setTrait] = useState("");
  const [limit, setLimit] = useState(90);
  const traitName = new Map(traits.map((t) => [t.id, t.name]));
  const tagged = useMemo(() => {
    const rankOf = (id: string) => (ranks[id] ? RANK_ORDER[ranks[id]!] : 9);
    return [...augments].sort((a, b) => rankOf(a.id) - rankOf(b.id) || a.name.localeCompare(b.name)).map((a) => ({ a, tags: tagsFor(a) }));
  }, [augments, ranks]);
  const list = tagged.filter(
    ({ a, tags }) =>
      (!tier || a.tier === tier) &&
      (!tag || tags.includes(tag)) &&
      (!trait || a.associatedTraits.includes(trait)) &&
      (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.desc.toLowerCase().includes(q.toLowerCase())),
  );
  const count = (t: Tag) => tagged.filter((x) => x.tags.includes(t)).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search augments" aria-label="Search augments" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-1" role="group" aria-label="Tier">
          {TIERS.map((t) => (
            <button key={t} type="button" className={`chip ${tier === t ? "chip-active" : ""}`} aria-pressed={tier === t} onClick={() => setTier(tier === t ? "" : t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          {TAGS.map((t) => (
            <button key={t} type="button" className={`chip ${tag === t ? "chip-active" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
              {TAG_LABEL[t]} <span className="text-dim">{count(t)}</span>
            </button>
          ))}
        </div>
        <select className="input max-w-[12rem]" aria-label="Filter by trait" value={trait} onChange={(e) => setTrait(e.target.value)}>
          <option value="">Any trait</option>
          {traits.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-dim">
          {list.length} of {augments.length} · sorted by tier
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, limit).map(({ a, tags }) => (
          <li key={a.id} className="panel flex gap-3 p-3">
            <ItemIcon icon={a.icon} name={a.name} size={40} />
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gold-bright">{a.name}</span>
                <TierBadge tier={a.tier} />
                <RankBadge rank={ranks[a.id]} size={16} />
              </div>
              <div className="mt-1">
                <TagChips tags={tags} size="xs" />
              </div>
              {a.associatedTraits.length ? <div className="mt-0.5 text-xs text-gold">{a.associatedTraits.map((t) => traitName.get(t) ?? t).join(", ")}</div> : null}
              <p className="mt-1 text-xs text-dim">
                <RichText text={a.desc} words />
              </p>
            </div>
          </li>
        ))}
      </ul>
      {list.length > limit ? (
        <div className="mt-4 text-center">
          <button type="button" className="btn" onClick={() => setLimit((l) => l + 90)}>
            Show more ({list.length - limit} left)
          </button>
        </div>
      ) : null}
    </div>
  );
}
