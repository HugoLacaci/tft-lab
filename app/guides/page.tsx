import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { guideSlugs, readGuide } from "@/lib/guide-sections";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";

export const metadata = { title: "Guides" };

const PILLARS: { id: string; title: string; blurb: string }[] = [
  { id: "economy", title: "Economy & tempo", blurb: "Gold, XP, rolling. The three levers and how they trade against each other." },
  { id: "board", title: "Board & items", blurb: "Items, augments, positioning: turning gold into a board that wins fights." },
  { id: "game", title: "Reading the game", blurb: "Scouting, HP, stage plans, pivots: the decisions that depend on the other seven players." },
];

export default function GuidesPage() {
  const guides = guideSlugs()
    .map((slug) => ({ slug, ...(readGuide(slug)?.data as { title?: string; description?: string; pillar?: string; order?: number }) }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return (
    <div>
      <PageTitle lede="Set-agnostic fundamentals written for players who know the vocabulary and want the reasoning. Each guide ends with the drill that trains it and a short list of habits to check in your next game.">
        Guides
      </PageTitle>
      <div className="space-y-10">
        {PILLARS.map((p) => (
          <section key={p.id}>
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{p.title}</div>
            <p className="mt-1 text-sm text-dim">{p.blurb}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {guides
                .filter((g) => g.pillar === p.id)
                .map((g) => (
                  <Link key={g.slug} href={`/guides/${g.slug}`} className="panel block p-4 hover:no-underline">
                    <div className="display text-base text-gold-bright">{g.title ?? g.slug}</div>
                    {g.description ? <p className="mt-1 text-xs text-dim">{g.description}</p> : null}
                  </Link>
                ))}
            </div>
          </section>
        ))}
        <Panel>
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Set-specific</div>
          <h2 className="mt-1 text-lg">
            {isSynced() ? (
              <Link href="/set">
                Set {CURRENT_SET.setNumber} · {setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName)} hub
              </Link>
            ) : (
              "Set hub (not synced)"
            )}
          </h2>
          <p className="mt-1 text-sm text-dim">Champions, traits, items and augments generated from the live game data, plus whatever set notes have been written so far.</p>
        </Panel>
      </div>
    </div>
  );
}
