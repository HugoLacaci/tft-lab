"use client";

import { useState } from "react";
import type { Augment, AugmentTier } from "@/lib/types";
import { ItemIcon, TierBadge } from "./icons";

const TIERS: AugmentTier[] = ["silver", "gold", "prismatic"];

export function AugmentList({ augments, traits }: { augments: Augment[]; traits: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<AugmentTier | "">("");
  const [trait, setTrait] = useState("");
  const [limit, setLimit] = useState(90);
  const traitName = new Map(traits.map((t) => [t.id, t.name]));
  const list = augments.filter(
    (a) =>
      (!tier || a.tier === tier) &&
      (!trait || a.associatedTraits.includes(trait)) &&
      (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.desc.toLowerCase().includes(q.toLowerCase())),
  );
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
        <select className="input max-w-[12rem]" aria-label="Filter by trait" value={trait} onChange={(e) => setTrait(e.target.value)}>
          <option value="">Any trait</option>
          {traits.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-dim">{list.length} of {augments.length}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, limit).map((a) => (
          <li key={a.id} className="panel flex gap-3 p-3">
            <ItemIcon icon={a.icon} name={a.name} size={40} />
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gold-bright">{a.name}</span>
                <TierBadge tier={a.tier} />
              </div>
              {a.associatedTraits.length ? (
                <div className="mt-0.5 text-xs text-gold">{a.associatedTraits.map((t) => traitName.get(t) ?? t).join(", ")}</div>
              ) : null}
              <p className="mt-1 whitespace-pre-line text-xs text-dim">{a.desc}</p>
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
