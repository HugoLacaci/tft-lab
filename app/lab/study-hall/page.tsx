import Link from "next/link";
import { PageTitle, Panel, SectionTitle } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { StudyCard } from "@/components/lab/StudyCard";
import { loadStudies } from "@/lib/studies";
import { STUDY_TAGS } from "@/lib/study-schema";
import { tierByLevel } from "@/lib/rank-tiers";
import { CREATORS } from "@/data/creators";
import { loadTimelines } from "@/lib/timelines-server";

export const metadata = {
  title: "Study Hall: pro and streamer games, broken down",
  description: "Real games from pros and top streamers with a stage-by-stage study guide: what they do at 2-1, 3-2, 4-1 and 5-1, why, and the drill that trains it. Plus the channels worth watching.",
};

const METHOD = [
  { t: "Pick one thing", d: "Before pressing play, decide what you are studying: level timings, item slams, the pivot, positioning. One game, one lens. Watching for everything teaches nothing." },
  { t: "Pause at the decision points", d: "2-1 augment, 3-2 level, the first slam, 4-1 rolldown, 4-2 augment, 5-1. Stop the video, make the call yourself, then watch what they do." },
  { t: "Write only the differences", d: "Note the decisions that differ from yours, with the timestamp. Three notes is a good game. Agreement is not information." },
  { t: "Drill it the same day", d: "Each guide item links the lesson that trains the habit. Ten drills right after the VOD is how the difference becomes yours." },
];

export default function StudyHallPage() {
  const studies = loadStudies();
  const tags = [...new Set(studies.flatMap((s) => s.tags))];
  const timelines = loadTimelines();
  const withTimeline = new Set(timelines.map((t) => t.studyId).filter(Boolean));
  return (
    <div>
      <div className="mb-2">
        <Link href="/lab" className="text-xs">
          ← Lab
        </Link>
      </div>
      <PageTitle
        lede="Real games from pros and top streamers, each with a study guide: what to watch at every stage, why it matters, the question to answer before they do, and the drill that trains the habit. Watch the decisions, not the highlights."
        aside={<Legend name="choncc-wise" size={120} glow="rgba(198,140,255,0.45)" tint="#c68cff" title="Choncc the Wise" />}
      >
        Study Hall
      </PageTitle>

      <Panel as="section" className="rise" glow="rgba(198,140,255,0.5)" aria-label="How to study a game">
        <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">How to study a game</div>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map((m, i) => (
            <li key={m.t} className="flex gap-3">
              <span className="display flex h-7 w-7 shrink-0 items-center justify-center border border-gold text-xs text-gold">{i + 1}</span>
              <div>
                <div className="display text-sm text-gold-bright">{m.t}</div>
                <p className="mt-0.5 text-xs text-dim">{m.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <section className="mt-8" aria-label="Game studies">
        <SectionTitle kicker={`${studies.length} games`}>Breakdowns</SectionTitle>
        <p className="-mt-2 mb-4 flex flex-wrap gap-1.5 text-xs text-dim">
          {tags.map((t) => (
            <span key={t} className="chip">
              {STUDY_TAGS[t] ?? t}
            </span>
          ))}
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((s, i) => (
            <li key={s.id} className="rise" style={{ ["--i" as string]: 1 + i * 0.5 } as React.CSSProperties}>
              <StudyCard study={s} hasTimeline={withTimeline.has(s.id)} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.7rem] text-dim">
          Videos stay on their creators&apos; channels; TFT Lab links to them and adds the guide. Timestamps come from each creator&apos;s own chapters where they published them. Legend:{" "}
          {[1, 2, 3, 4].map((l) => {
            const t = tierByLevel(l);
            return (
              <span key={l} className="mr-2 inline-flex items-center gap-1" style={{ color: t.color }}>
                <RankEmblem tier={t} size={11} />
                {t.short}
              </span>
            );
          })}
          = who gets the most out of it.
        </p>
      </section>

      <section className="mt-10" aria-label="Game timelines">
        <SectionTitle kicker="Round by round">Timelines and decisions</SectionTitle>
        <p className="mb-3 text-sm text-dim">
          A game as exact states (gold, HP, level, shop, board) and the decision between every two of them, derived from the numbers: rolls, buys, sells, items, positioning. Annotated from the VOD in the editor; nothing is asserted that is not in a state. The example timelines are hand-built games that exercise the format.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {timelines.map((t) => {
            const last = t.rounds[t.rounds.length - 1]!;
            const study = t.studyId ? studies.find((x) => x.id === t.studyId) : undefined;
            return (
              <li key={t.matchId}>
                <Link href={`/lab/study-hall/timeline/${t.matchId}`} className="panel flex h-full flex-col gap-1 p-3 hover:no-underline">
                  <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">{t.source === "fixture" ? "example" : study ? `${study.player.name} · annotated` : t.source}</div>
                  <div className="display text-sm text-gold-bright">{t.title ?? t.matchId}</div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-[0.65rem]">
                    <span className="chip">{t.rounds.length} states</span>
                    <span className="chip">
                      {t.rounds[0]?.stage} → {last.stage}
                    </span>
                    {t.finalPlacement ? <span className="chip">{t.finalPlacement}th</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-label="Channels to watch">
        <SectionTitle kicker="Watch and learn">Pros and streamers</SectionTitle>
        <p className="mb-3 text-sm text-dim">
          <span className="chip">teaching</span> channels talk through decisions; <span className="chip">high-level</span> channels play at the top and mostly do not narrate. For the second kind, use the method above and pause at the decision points yourself. Tournament VODs (TFT Pro Circuit cups) are on the <Link href="/compete">Compete</Link> page.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CREATORS.map((c) => (
            <Panel key={c.name} as="article">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base">
                  <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-gold-bright">
                    {c.name}
                  </a>
                </h3>
                <span className="chip">{c.kind}</span>
                <span className="text-xs text-dim">{c.platform}</span>
              </div>
              <p className="mt-1 text-sm text-dim">{c.learn}</p>
              {c.youtube && c.youtube !== c.link ? (
                <a href={c.youtube} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs">
                  YouTube ↗
                </a>
              ) : null}
            </Panel>
          ))}
        </div>
      </section>

      <p className="mt-8 flex items-center gap-2 text-xs text-dim">
        <Glyph name="hint" size={14} className="text-gold" />
        Want a game broken down? The guide format is a JSON file in the repo; every study links the guide section and the trainer lesson so the lesson can be drilled right after.
      </p>
    </div>
  );
}
