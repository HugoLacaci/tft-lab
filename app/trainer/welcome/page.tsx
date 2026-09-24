import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { PathMap } from "@/components/trainer/PathMap";
import { lessonScenarioIds } from "@/lib/lessons-server";
import { lessonsOf } from "@/lib/curriculum";

export const metadata = {
  title: "Welcome to TFT: learn to play from zero",
  description: "Never played Teamfight Tactics? Nine short lessons with drills on a real board: what a round is, the shop, traits, items, gold and interest, levels, the flow of a game, where units stand, and a first game plan.",
};

const STEPS = [
  { t: "Read", d: "The Welcome guide explains every idea in plain words: no vocabulary assumed, ten minutes to read." },
  { t: "Drill", d: "Each lesson has four short drills on a real board. You decide, you get scored, you read why. Ask for a hint any time." },
  { t: "Pass", d: "Solve most of a lesson's drills and the next one opens. Miss one and it comes back until it sticks." },
  { t: "Play", d: "After the nine lessons you know enough to place top 4 in your first games. The Fundamentals module takes it from there." },
];

export default function WelcomePage() {
  const ids = lessonScenarioIds();
  const lessons = lessonsOf("welcome").filter((l) => (ids[l.id]?.length ?? 0) > 0);
  const first = lessons[0];
  return (
    <div>
      <div className="mb-2">
        <Link href="/trainer" className="text-xs">
          ← Trainer
        </Link>
      </div>
      <PageTitle
        lede="Teamfight Tactics is a game of eight players, one shared shop and one board each: buy champions, put them where they should stand, and your team fights for you. This is the place to start if you have never played. No account, no download, no vocabulary assumed."
        aside={<Legend name="pengu-1" size={120} glow="rgba(127,211,255,0.4)" tint="#7fd3ff" title="Pengu" />}
      >
        Welcome to TFT
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel className="rise" glow="#7fd3ff">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">How this works</div>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="display flex h-7 w-7 shrink-0 items-center justify-center border border-gold text-xs text-gold">{i + 1}</span>
                <div>
                  <div className="display text-sm text-gold-bright">{s.t}</div>
                  <p className="mt-0.5 text-xs text-dim">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {first ? (
              <Link href={`/trainer/path/${first.id}`} className="btn btn-primary">
                Start lesson 1: {first.title}
              </Link>
            ) : null}
            <Link href="/guides/welcome" className="btn">
              <Glyph name="guides" size={14} />
              Read the Welcome guide
            </Link>
          </div>
        </Panel>
        <Panel className="rise" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">What you will know after the nine lessons</div>
          <ul className="mt-3 space-y-1.5 text-sm text-dim">
            {["What a round is, how you lose HP, and why 4th is a good result", "How the shop works and how three copies make a 2-star", "What traits and breakpoints do, and how to pick units that work together", "How items combine and who should hold them", "Why 50 gold earns more than 20, and when to spend", "What levels do and when to buy XP", "The rhythm of a game: stages, PvE rounds, carousel, augments", "Where tanks and carries stand, and why", "A first game plan that gets you to top 4"].map((x) => (
              <li key={x} className="flex gap-2">
                <Glyph name="check" size={14} className="mt-0.5 shrink-0 text-teal" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-8">
        <PathMap lessonIds={ids} only="welcome" />
      </div>

      <p className="mt-6 text-xs text-dim">
        Already play? The <Link href="/trainer/path">full path</Link> lets you place yourself at your rank and start where it gets hard.
      </p>
    </div>
  );
}
