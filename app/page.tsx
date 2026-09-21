import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { Glyph, type GlyphName } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";
import { RANK_TIERS } from "@/lib/rank-tiers";

const PILLARS: { href: string; title: string; kicker: string; body: string; cta: string; ctaHref: string; glyph: GlyphName }[] = [
  {
    href: "/guides",
    title: "Guides",
    kicker: "Learn the fundamentals",
    body: "Economy, leveling, rolling, items, augments, positioning, scouting and HP management. Set-agnostic, written for players who already know the vocabulary and want the reasoning.",
    cta: "Start with Economy",
    ctaHref: "/guides/economy",
    glyph: "guides",
  },
  {
    href: "/trainer",
    title: "Trainer",
    kicker: "Drill the decisions",
    body: "Real board states on a real hex board. Make the call, get scored, read why. Missed drills come back on a spaced schedule until they stick.",
    cta: "Run a Daily 10",
    ctaHref: "/trainer",
    glyph: "trainer",
  },
  {
    href: "/trainer/puzzles",
    title: "Puzzles",
    kicker: "Chess puzzles, but TFT",
    body: "One board, one best move. Positioning and game-sense puzzles with the champions of the live set, graded by rank from Iron to Master+. Find the move, then read the key.",
    cta: "Open the ladder",
    ctaHref: "/trainer/puzzles",
    glyph: "puzzle",
  },
  {
    href: "/lab",
    title: "Lab",
    kicker: "Plan and simulate",
    body: "Roll odds, an econ simulator, a printable cheat sheet, and a team planner that fights your board against an enemy board a few thousand times.",
    cta: "Open the planner",
    ctaHref: "/lab/board",
    glyph: "lab",
  },
];

export default function HomePage() {
  const synced = isSynced();
  const setName = synced ? setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName) : null;
  return (
    <div className="space-y-12">
      <section className="relative py-10 sm:py-16">
        {/* hero ornament: rotating hex rings behind the legends */}
        <div aria-hidden className="pointer-events-none absolute -right-56 top-4 hidden h-[26rem] w-[26rem] lg:block xl:-right-72">
          <svg viewBox="0 0 200 200" className="h-full w-full opacity-60">
            <polygon points="100,6 181,53 181,147 100,194 19,147 19,53" fill="none" stroke="var(--gold)" strokeWidth="0.6" strokeDasharray="4 6" className="hex-spin" />
            <polygon points="100,30 160,65 160,135 100,170 40,135 40,65" fill="none" stroke="var(--teal)" strokeWidth="0.6" strokeDasharray="2 5" className="hex-spin-rev" />
            <polygon points="100,54 140,77 140,123 100,146 60,123 60,77" fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.6" />
          </svg>
          <div className="absolute left-[38%] top-[22%]">
            <Legend name="pengu-3" size={128} delay={0} glow="rgba(200,170,110,0.5)" title="Pengu Featherknight" />
          </div>
          <div className="absolute left-[8%] top-[48%]">
            <Legend name="choncc-2" size={104} delay={1.6} tint="#0ac8b9" glow="rgba(10,200,185,0.45)" title="Choncc" />
          </div>
          <div className="absolute left-[62%] top-[62%]">
            <Legend name="silverwing" size={72} delay={0.8} tint="#c68cff" glow="rgba(198,140,255,0.45)" title="Silverwing" />
          </div>
        </div>

        <div className="relative max-w-3xl">
          <div className="rise display text-[0.7rem] uppercase tracking-[0.3em] text-gold">Iron → Diamond → Master+ → Competitive</div>
          <h1 className="rise mt-3 text-3xl leading-tight sm:text-5xl" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
            Stop losing games in the rounds you don&apos;t remember.
          </h1>
          <p className="rise mt-5 max-w-2xl text-lg text-dim" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
            TFT Lab is a study tool for Teamfight Tactics. Not a meta site: the comps live elsewhere. This is where you
            learn <em>why</em> the standard play is standard, drill the decisions that separate Diamond from Master,
            and keep a record of the leaks you keep repeating.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
            <Link href="/trainer" className="btn btn-primary">
              Open the Trainer
            </Link>
            <Link href="/trainer/puzzles" className="btn">
              <Glyph name="puzzle" size={16} />
              Tactics puzzles
            </Link>
            <Link href="/guides/economy" className="btn">
              Read the Economy guide
            </Link>
            {synced ? (
              <Link href="/set" className="btn">
                Set {CURRENT_SET.setNumber} · {setName}
              </Link>
            ) : null}
          </div>
          <div className="rise mt-8 flex flex-wrap items-center gap-3 text-xs text-dim" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
            <span className="display uppercase tracking-[0.2em] text-gold">Puzzle ladder</span>
            {RANK_TIERS.map((t) => (
              <Link key={t.id} href={`/trainer/puzzles/${t.id}`} className="flex items-center gap-1 hover:no-underline" style={{ color: t.color }}>
                <RankEmblem tier={t} size={22} />
                <span className="display text-[0.65rem] uppercase tracking-wider">{t.short}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-10 flex justify-center gap-6 lg:hidden" aria-hidden>
          <Legend name="pengu-3" size={84} />
          <Legend name="choncc-2" size={84} delay={1.2} tint="#0ac8b9" glow="rgba(10,200,185,0.45)" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p, i) => (
          <Panel key={p.href} as="article" className="panel-hover rise flex flex-col" style={{ ["--i" as string]: 2 + i } as React.CSSProperties}>
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
          <Legend name="hauntling" size={56} float={false} tint="#e0483a" glow="rgba(224,72,58,0.35)" />
          <div>
            <h2 className="text-lg">What this is not</h2>
            <p className="mt-2 text-sm text-dim">
              It is not a stats site. We do not scrape MetaTFT, tactics.tools, Mobalytics or anyone else. When you need
              the current meta, go to them; <Link href="/resources">Resources</Link> tells you which one to use for what.
              Teaching is what lives here.
            </p>
          </div>
        </Panel>
        <Panel className="rise flex gap-4" style={{ ["--i" as string]: 7 } as React.CSSProperties}>
          <Legend name="runespirit" size={56} float={false} tint="#0ac8b9" glow="rgba(10,200,185,0.35)" />
          <div>
            <h2 className="text-lg">How it stays current</h2>
            <p className="mt-2 text-sm text-dim">
              Champions, traits, items and augments sync from CommunityDragon on a schedule. When a new set ships, the{" "}
              <Link href="/set">Set hub</Link> updates on its own and the written guides get a human pass. The
              fundamentals do not change with the set.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
