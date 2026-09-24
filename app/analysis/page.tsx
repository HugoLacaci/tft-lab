import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { MiniBoard } from "@/components/trainer/MiniBoard";
import { loadTimelines } from "@/lib/analysis-server";
import { unitLookup } from "@/lib/set-data";
import { GENERIC_UNITS } from "@/data/archetypes";

export const metadata = {
  title: "Game analysis (preview)",
  description: "Round-by-round timelines of TFT games with every decision derived from the recorded state: gold, rolls, buys, items, positioning. Fixture games for now; Riot API and VOD ingestion follow.",
};

export default function AnalysisIndex() {
  const timelines = loadTimelines();
  const units = { ...GENERIC_UNITS, ...unitLookup() };
  return (
    <div>
      <PageTitle lede="Oracle's first surface: a game as a timeline of exact states, and every decision between two states derived from the numbers, never from prose. These are hand-built fixture games that exercise the format; ingestion from the Riot API and from recordings comes next. Verdicts come after the eval harness.">
        Game analysis
      </PageTitle>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {timelines.map((t) => {
          const last = t.rounds[t.rounds.length - 1]!;
          return (
            <li key={t.matchId}>
              <Link href={`/analysis/${t.matchId}`} className="puzzle-card panel flex h-full flex-col gap-3 p-3 hover:no-underline">
                <div className="flex justify-center overflow-hidden">
                  <MiniBoard board={last.board} units={units} hex={19} />
                </div>
                <div className="min-w-0">
                  <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">
                    {t.source} · patch {t.patch}
                  </div>
                  <div className="display mt-0.5 text-sm leading-snug text-gold-bright">{t.title ?? t.matchId}</div>
                  <p className="mt-1 line-clamp-3 text-xs text-dim">{t.notes}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 text-[0.65rem]">
                  <span className="chip">{t.rounds.length} states</span>
                  <span className="chip">{t.rounds[0]?.stage} → {last.stage}</span>
                  {t.finalPlacement ? <span className="chip">{t.finalPlacement}th</span> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Panel className="mt-8">
        <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">What this is, and is not, yet</div>
        <p className="mt-2 text-sm text-dim">
          The ontology (<code>packages/ontology</code>) is the contract every later source must satisfy: Riot API final boards, frames from a recording, or a screen capture. <code>deriveDecisions</code> solves the accounting equation for each pair of states and refuses to guess: when gold does not add up the decision is marked low-confidence and the residual is shown. No model is involved in anything on this page. The plan and its open questions are in <code>docs/PLAN.md</code>.
        </p>
      </Panel>
    </div>
  );
}
