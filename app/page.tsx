import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { Glyph, type GlyphName } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { CompsSpotlight } from "@/components/home/CompsSpotlight";
import { NewPill } from "@/components/ui/NewBadge";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";
import { RANK_TIERS } from "@/lib/rank-tiers";
import { loadSetData } from "@/lib/set-data";
import { livePatch } from "@/lib/live-patch";
import { loadPatchNotes } from "@/lib/patch-notes";
import { newsStamps } from "@/lib/whats-new-server";

const PILLARS: { href: string; title: string; kicker: string; body: string; cta: string; ctaHref: string; glyph: GlyphName }[] = [
  {
    href: "/trainer",
    title: "Trainer",
    kicker: "Drill the decisions",
    body: "Real board states on a real hex board. Make the call, get scored, read why. Missed drills come back on a spaced schedule until they stick.",
    cta: "Run a Daily 10",
    ctaHref: "/trainer/daily",
    glyph: "trainer",
  },
  {
    href: "/trainer/puzzles",
    title: "Puzzles",
    kicker: "Chess puzzles, but TFT",
    body: "One board, one best move. Positioning and game-sense puzzles with the champions of the live set, graded by rank from Iron to Master+.",
    cta: "Open the ladder",
    ctaHref: "/trainer/puzzles",
    glyph: "puzzle",
  },
  {
    href: "/lab",
    title: "Lab",
    kicker: "Plan and simulate",
    body: "A team planner that fights your board against an enemy board a few thousand times, roll odds, an econ simulator and a printable cheat sheet.",
    cta: "Open the planner",
    ctaHref: "/lab/board",
    glyph: "lab",
  },
  {
    href: "/guides",
    title: "Guides",
    kicker: "Learn the fundamentals",
    body: "Economy, leveling, rolling, items, augments, positioning, scouting and HP management. Set-agnostic, written for players who want the reasoning.",
    cta: "Start with Economy",
    ctaHref: "/guides/economy",
    glyph: "guides",
  },
];

export default function HomePage() {
  const synced = isSynced();
  const setName = synced ? setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName) : null;
  const patch = livePatch();
  const set = loadSetData();
  const notes = loadPatchNotes();
  const newest = notes?.notes[0] ?? null;
  const stamps = newsStamps();
  const tiles: { href: string; label: string; n: string | number; news?: "comps" | "patch-notes" }[] = set
    ? [
        { href: "/set/champions", label: "Champions", n: set.champions.length },
        { href: "/set/traits", label: "Traits", n: set.traits.length },
        { href: "/set/items", label: "Items", n: set.items.filter((i) => i.kind !== "other" && i.kind !== "charm").length },
        { href: "/set/augments", label: "Augments", n: set.augments.length },
        { href: "/set/wisps", label: "Wisps", n: set.items.filter((i) => i.kind === "charm" && !/_Upgrade$/i.test(i.id)).length },
        { href: "/set/patch-notes", label: "Patch notes", n: patch.fromNotes ? patch.label : "→", news: "patch-notes" },
      ]
    : [];

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="hero relative py-6 sm:py-10 lg:py-14">
        <div className="hero-grid">
          <div className="relative min-w-0">
            <div className="rise display flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.3em] text-gold">
              {synced ? (
                <>
                  <span>
                    Set {CURRENT_SET.setNumber} · {setName}
                  </span>
                  <span className="set-badge-patch normal-case tracking-normal">Patch {patch.label}</span>
                  <NewPill area="patch-notes" stamps={stamps} />
                </>
              ) : (
                <span>Teamfight Tactics</span>
              )}
            </div>
            <h1 className="rise mt-3 text-3xl leading-tight sm:text-4xl lg:text-5xl" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
              The comps to play this patch, and the drills to play them well.
            </h1>
            <p className="hero-lede rise mt-4 max-w-2xl text-base text-dim sm:text-lg" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
              A tier list with positioning, items and augments for every comp. Champions, traits, items, augments and patch notes that refresh on their own every patch. Then a trainer, a fight simulator and a tracker
              to turn knowledge into placements.
            </p>
            <div className="rise mt-6 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
              <Link href="/set/comps" className="btn btn-lg btn-comps" data-testid="hero-comps">
                <Glyph name="comps" size={18} strokeWidth={2} />
                Comps tier list
              </Link>
              <Link href="/set" className="btn btn-lg">
                <Glyph name="set" size={16} />
                Live set
              </Link>
              <Link href="/trainer" className="btn btn-lg btn-primary">
                <Glyph name="trainer" size={16} />
                Trainer
              </Link>
            </div>
            <div className="rise mt-6 flex flex-wrap items-center gap-3 text-xs text-dim" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
              <span className="display uppercase tracking-[0.2em] text-gold">Puzzle ladder</span>
              {RANK_TIERS.map((t) => (
                <Link key={t.id} href={`/trainer/puzzles/${t.id}`} className="flex items-center gap-1 hover:no-underline" style={{ color: t.color }}>
                  <RankEmblem tier={t} size={22} />
                  <span className="display text-[0.65rem] uppercase tracking-wider">{t.short}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <CompsSpotlight />
          </div>
        </div>
      </section>

      {tiles.length ? (
        <section aria-label="Live set" className="rise" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg sm:text-xl">Live set data</h2>
            <span className="text-xs text-dim">
              Synced {CURRENT_SET.syncedAt.slice(0, 10)} from CommunityDragon
              {newest ? (
                <>
                  {" "}
                  · newest notes: <Link href="/set/patch-notes">{newest.title}</Link> ({newest.publishedAt.slice(0, 10)})
                </>
              ) : null}
            </span>
          </div>
          <div className="quick-tiles">
            {tiles.map((t) => (
              <Link key={t.href} href={t.href} className="panel panel-hover quick-tile">
                <span className="quick-tile-n">{t.n}</span>
                <span className="quick-tile-l">
                  {t.label}
                  {t.news ? <NewPill area={t.news} stamps={stamps} className="ml-1" /> : null}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p, i) => (
          <Panel key={p.href} as="article" className="panel-hover rise flex flex-col" style={{ ["--i" as string]: 3 + i } as React.CSSProperties}>
            <div className="display flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-gold">
              <Glyph name={p.glyph} size={16} />
              {p.kicker}
            </div>
            <h2 className="mt-1 text-2xl">
              <Link href={p.href} className="text-gold-bright hover:no-underline">
                {p.title}
              </Link>
            </h2>
            <p className="mt-3 flex-1 text-sm text-dim">{p.body}</p>
            <Link href={p.ctaHref} className="btn btn-sm mt-5 self-start">
              {p.cta}
            </Link>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel className="rise flex gap-4" style={{ ["--i" as string]: 6 } as React.CSSProperties}>
          <Legend name="runespirit" size={56} float={false} tint="#0ac8b9" glow="rgba(10,200,185,0.35)" />
          <div>
            <h2 className="text-lg">Always on the live patch</h2>
            <p className="mt-2 text-sm text-dim">
              Champions, traits, items, augments and wisps sync from CommunityDragon several times a day; Riot&apos;s patch notes are mirrored the moment they go up. Comps are re-verified after each patch, and the
              page says so when they are still being reviewed.
            </p>
          </div>
        </Panel>
        <Panel className="rise flex gap-4" style={{ ["--i" as string]: 7 } as React.CSSProperties}>
          <Legend name="hauntling" size={56} float={false} tint="#e0483a" glow="rgba(224,72,58,0.35)" />
          <div>
            <h2 className="text-lg">Built for the climb</h2>
            <p className="mt-2 text-sm text-dim">
              Every comp opens on the real board, so positioning is something you see, not a paragraph. Every drill links to the guide that explains the reasoning, and the <Link href="/tracker">tracker</Link> turns
              your own match history into the leaks to fix next.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
