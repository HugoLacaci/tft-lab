import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CompList } from "@/components/set/CompList";
import { loadComps } from "@/lib/comps";
import { itemLookup, requireSetData, traitLookup, unitLookup } from "@/lib/set-data";
import { loadTiers, ranksById } from "@/lib/tiers";
import { loadMeta } from "@/lib/meta";
import type { LiveComp } from "@/components/set/CompList";
import { compsChangesStamp } from "@/lib/comps-changes";
import { loadCompsChanges } from "@/lib/comps-changes-server";
import { compsFreshness } from "@/lib/live-patch";

export const metadata = {
  title: "Comps tier list",
  description: "The best Teamfight Tactics comps this patch, ranked S to C, each with positioning on the board, carries and items, flexible units, augments and how to play it.",
};

export default function CompsPage() {
  const data = requireSetData();
  const file = loadComps();
  if (!file) {
    return (
      <Panel>
        <SectionTitle kicker="Comps">No comps for this set yet</SectionTitle>
        <p className="text-sm text-dim">Add content/sets/&lt;n&gt;/comps.json (see the README runbook).</p>
      </Panel>
    );
  }
  const tiers = loadTiers();
  const traitNames = Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name]));
  const augments = Object.fromEntries(data.augments.map((a) => [a.id, { id: a.id, name: a.name, icon: a.icon, tier: a.tier, desc: a.desc }]));
  const fresh = compsFreshness();
  // An augment Riot renamed or removed mid-set is skipped rather than shown as a raw id (the validator warns about it).
  const known = { ...file, comps: file.comps.map((c) => ({ ...c, augments: c.augments.filter((a) => a.augmentId in augments) })) };
  const meta = loadMeta();
  // Match each curated comp to a live cluster by its two most-counted traits.
  const champTraits = new Map(data.champions.map((c) => [c.id, c.traits]));
  const live: Record<string, LiveComp> = {};
  if (meta) {
    const byKey = new Map(meta.comps.map((m) => [m.key, m]));
    for (const c of known.comps) {
      const counts = new Map<string, number>();
      const seen = new Set<string>();
      for (const [id] of c.board) {
        if (seen.has(id)) continue;
        seen.add(id);
        for (const t of champTraits.get(id) ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      const top = [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([t]) => t)
        .sort();
      const m = byKey.get(top.join("+"));
      if (m) live[c.id] = { key: m.key, name: m.name, games: m.games, avg: m.avg, top4: m.top4, win: m.win, units: m.units };
    }
  }
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-dim">
        The lines worth learning this patch, ordered by tier. Each card opens into the full guide: default positioning on the real board, carries with their best items, flexible and late-game units, best augments and how to play it. Open any board in the team planner to
        simulate it against a lobby board.
      </p>
      <CompList
        file={known}
        freshness={{ curatedPatch: fresh.curatedPatch, livePatch: fresh.live.label, stale: fresh.stale, publishedAt: fresh.live.publishedAt, notesHref: fresh.live.notesHref }}
        changes={loadCompsChanges()}
        changesStamp={compsChangesStamp(loadCompsChanges())}
        meta={meta ? { patch: meta.patch, syncedAt: meta.syncedAt, matches: meta.matches, comps: meta.comps.map((m) => ({ key: m.key, name: m.name, games: m.games, avg: m.avg, top4: m.top4, win: m.win, units: m.units })) } : null}
        live={live}
        units={unitLookup()}
        items={itemLookup()}
        traitNames={traitNames}
        traits={Object.fromEntries(data.traits.map((t) => [t.id, { id: t.id, name: t.name, icon: t.icon, breakpoints: t.breakpoints.map((b) => ({ units: b.units, style: b.style })) }]))}
        augments={augments}
        itemRanks={ranksById(data.items, tiers?.items)}
        augmentRanks={ranksById(data.augments, tiers?.augments)}
      />
    </div>
  );
}
