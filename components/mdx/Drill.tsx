import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_LABELS, type ScenarioCategory } from "@/lib/scenario-categories";

export function DrillThis({ category, children }: { category: ScenarioCategory; children?: ReactNode }) {
  return (
    <aside className="panel my-8 flex flex-wrap items-center gap-4 border-l-4 border-l-teal p-4">
      <div className="flex-1">
        <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-teal">Drill this</div>
        <p className="mt-1 text-sm">{children ?? `Run the ${CATEGORY_LABELS[category]} drills until you stop missing them.`}</p>
      </div>
      <Link href={`/trainer/${category}`} className="btn btn-primary btn-sm">
        Open {CATEGORY_LABELS[category]} drills
      </Link>
    </aside>
  );
}

export function CheckYourself({ items }: { items: string[] }) {
  return (
    <aside className="panel my-8 p-4">
      <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Check yourself</div>
      <ul className="mt-2 space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-1 inline-block h-3 w-3 shrink-0 rotate-45 border border-gold" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
