"use client";

import { useState } from "react";
import type { ItemKind } from "@/lib/types";
import { ItemIcon } from "./icons";

interface I {
  id: string;
  name: string;
  desc: string;
  icon: string;
  kind: ItemKind;
  composition: string[];
}

const KINDS: { id: ItemKind; label: string }[] = [
  { id: "component", label: "Components" },
  { id: "completed", label: "Completed" },
  { id: "emblem", label: "Emblems" },
  { id: "artifact", label: "Artifacts" },
  { id: "radiant", label: "Radiant" },
  { id: "support", label: "Support" },
  { id: "other", label: "Other" },
];

export function ItemList({ items }: { items: I[] }) {
  const [kind, setKind] = useState<ItemKind>("completed");
  const [q, setQ] = useState("");
  const list = items.filter((i) => i.kind === kind && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
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
      </div>
      {kind === "other" ? (
        <p className="mb-3 text-xs text-dim">
          “Other” holds consumables and set-mechanic entries CommunityDragon lists alongside items. Most are not shop items.
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <li key={i.id} className="panel flex gap-3 p-3">
            <ItemIcon icon={i.icon} name={i.name} size={40} />
            <div className="min-w-0 text-sm">
              <div className="text-gold-bright">{i.name}</div>
              {i.composition.length ? <div className="text-xs text-dim">{i.composition.join(" + ")}</div> : null}
              {i.desc ? <p className="mt-1 whitespace-pre-line text-xs text-dim">{i.desc}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
