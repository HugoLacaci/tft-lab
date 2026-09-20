"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COSTS, type Cost } from "@/lib/costs";
import { ChampionCard, Hover, type ChampionCardData } from "./hovers";
import { TraitIcon, UnitIcon } from "./icons";

interface T {
  id: string;
  name: string;
  icon: string;
}

export function ChampionGrid({ champions, traits }: { champions: ChampionCardData[]; traits: T[] }) {
  const [q, setQ] = useState("");
  const [cost, setCost] = useState<Cost | 0>(0);
  const [trait, setTrait] = useState("");
  const traitMap = useMemo(() => Object.fromEntries(traits.map((t) => [t.id, t])), [traits]);

  const list = champions.filter(
    (c) =>
      (!cost || c.cost === cost) &&
      (!trait || c.traits.includes(trait)) &&
      (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.traits.some((t) => traitMap[t]?.name.toLowerCase().includes(q.toLowerCase()))),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="champ-q">
          Search champions
        </label>
        <input id="champ-q" className="input max-w-xs" placeholder="Search name or trait" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-1" role="group" aria-label="Filter by cost">
          <button type="button" className={`chip ${cost === 0 ? "chip-active" : ""}`} onClick={() => setCost(0)}>
            All
          </button>
          {COSTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${cost === c ? "chip-active" : ""}`}
              style={{ borderColor: cost === c ? `var(--cost-${c})` : undefined }}
              onClick={() => setCost(cost === c ? 0 : c)}
              aria-pressed={cost === c}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="champ-trait">
          Filter by trait
        </label>
        <select id="champ-trait" className="input max-w-[12rem]" value={trait} onChange={(e) => setTrait(e.target.value)}>
          <option value="">All traits</option>
          {traits.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-dim">{list.length} shown · hover a card for the ability</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((c) => (
          <li key={c.id}>
            <Hover content={<ChampionCard c={c} traits={traitMap} />}>
              <Link href={`/set/champions/${c.id}`} className="panel flex h-full items-center gap-3 p-3 hover:no-underline">
                <UnitIcon icon={c.icon} name={c.name} cost={c.cost} size={44} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-gold-bright">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.traits.map((t) => (
                      <span key={t} className="inline-flex items-center gap-0.5 text-[0.65rem] text-dim" title={traitMap[t]?.name}>
                        <TraitIcon icon={traitMap[t]?.icon ?? ""} name={traitMap[t]?.name ?? t} size={12} />
                        {traitMap[t]?.name ?? t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </Hover>
          </li>
        ))}
      </ul>
    </div>
  );
}
