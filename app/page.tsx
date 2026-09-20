import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { CURRENT_SET, isSynced } from "@/lib/current-set";
import { setDisplayName } from "@/lib/set-meta";

const PILLARS = [
  {
    href: "/guides",
    title: "Guides",
    kicker: "Learn the fundamentals",
    body: "Economy, leveling, rolling, items, augments, positioning, scouting and HP management. Set-agnostic, written for players who already know the vocabulary and want the reasoning.",
    cta: "Start with Economy",
    ctaHref: "/guides/economy",
  },
  {
    href: "/trainer",
    title: "Trainer",
    kicker: "Drill the decisions",
    body: "Real board states on a real hex board. Make the call, get scored, read why. Missed drills come back on a spaced schedule until they stick.",
    cta: "Run a Daily 10",
    ctaHref: "/trainer",
  },
  {
    href: "/routine",
    title: "Path",
    kicker: "Climb with a plan",
    body: "A weekly routine, a VOD-review method that fits in twenty minutes, a leak tracker that lives in your browser, and the real road from ladder to the Pro Circuit.",
    cta: "See the routine",
    ctaHref: "/routine",
  },
];

export default function HomePage() {
  const synced = isSynced();
  const setName = synced ? setDisplayName(CURRENT_SET.setNumber, CURRENT_SET.setName) : null;
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden py-10 sm:py-16">
        <div className="display text-[0.7rem] uppercase tracking-[0.3em] text-gold">Emerald → Master+ → Competitive</div>
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight sm:text-5xl">
          Stop losing games in the rounds you don&apos;t remember.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-dim">
          TFT Lab is a study tool for Teamfight Tactics. Not a meta site: the comps live elsewhere. This is where you
          learn <em>why</em> the standard play is standard, drill the decisions that separate Diamond from Master,
          and keep a record of the leaks you keep repeating.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/trainer" className="btn btn-primary">
            Open the Trainer
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <Panel key={p.href} as="article" className="flex flex-col">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{p.kicker}</div>
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
        <Panel>
          <h2 className="text-lg">What this is not</h2>
          <p className="mt-2 text-sm text-dim">
            It is not a stats site. We do not scrape MetaTFT, tactics.tools, Mobalytics or anyone else. When you need
            the current meta, go to them; <Link href="/resources">Resources</Link> tells you which one to use for what.
            Teaching is what lives here.
          </p>
        </Panel>
        <Panel>
          <h2 className="text-lg">How it stays current</h2>
          <p className="mt-2 text-sm text-dim">
            Champions, traits, items and augments sync from CommunityDragon on a schedule. When a new set ships, the{" "}
            <Link href="/set">Set hub</Link> updates on its own and the written guides get a human pass. The
            fundamentals do not change with the set.
          </p>
        </Panel>
      </section>
    </div>
  );
}
