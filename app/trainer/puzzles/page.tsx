import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { Legend, type LegendName } from "@/components/ui/Legend";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Glyph } from "@/components/ui/Glyphs";
import { MiniBoard } from "@/components/trainer/MiniBoard";
import { PuzzleTick, TierProgress } from "@/components/trainer/PuzzleProgress";
import { RANK_TIERS } from "@/lib/rank-tiers";
import { loadPuzzles, puzzleTitle } from "@/lib/puzzles";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { unitLookup } from "@/lib/set-data";
import { GENERIC_UNITS } from "@/data/archetypes";

export const metadata = { title: "Tactics puzzles" };

const Q_LABEL: Record<string, string> = {
  placement: "place a unit",
  swap: "swap two units",
  choice: "find the call",
  "item-holder": "who holds it",
  ordering: "put in order",
  augment: "pick the augment",
};

export default function PuzzlesPage() {
  const puzzles = loadPuzzles();
  const units = { ...GENERIC_UNITS, ...unitLookup() };
  return (
    <div>
      <PageTitle
        lede="Chess puzzles, but TFT. One board, one best move: place a unit, swap two, or make the call. Every puzzle explains the key afterwards and links the guide section it comes from. Start at your rank; the tiers above it are the reason you are stuck."
        aside={<Legend name="choncc-wise" size={120} glow="rgba(198,140,255,0.45)" tint="#c68cff" title="Choncc the Wise" />}
      >
        Tactics puzzles
      </PageTitle>

      <div className="space-y-8">
        {RANK_TIERS.map((tier, ti) => {
          const list = puzzles.filter((p) => p.difficulty === tier.level);
          const ids = list.map((p) => p.id);
          return (
            <Panel key={tier.id} as="section" glow={tier.color} className="rise" style={{ ["--i" as string]: ti } as React.CSSProperties} aria-label={`${tier.label} puzzles`}>
              <div className="flex flex-wrap items-center gap-4">
                <Legend name={tier.legend as LegendName} size={64} tint={tier.color} glow={tier.glow} delay={ti * 0.7} />
                <RankEmblem tier={tier} size={44} spin />
                <div className="min-w-[14rem] flex-1">
                  <h2 className="text-xl" style={{ color: tier.color }}>
                    {tier.label}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-dim">{tier.blurb}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <TierProgress ids={ids} />
                  <Link href={`/trainer/puzzles/${tier.id}`} className="btn btn-sm btn-primary">
                    Play the tier
                  </Link>
                </div>
              </div>

              {list.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p, i) => (
                    <li key={p.id} className="rise" style={{ ["--i" as string]: ti + 1 + i * 0.5 } as React.CSSProperties}>
                      <Link href={`/trainer/puzzles/${tier.id}#${p.id}`} className="puzzle-card panel flex h-full flex-col gap-3 p-3 hover:no-underline">
                        <div className="flex justify-center overflow-hidden">
                          <MiniBoard board={p.state.board} enemyBoard={p.state.enemyBoard} units={units} hex={p.state.enemyBoard?.length ? 15 : 19} />
                        </div>
                        <div className="min-w-0">
                          <div className="display text-sm leading-snug text-gold-bright">{puzzleTitle(p)}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="chip">
                              <Glyph name={p.category} size={12} />
                              {CATEGORY_LABELS[p.category]}
                            </span>
                            <span className="chip">{Q_LABEL[p.question.type] ?? p.question.type}</span>
                            {!p.setAgnostic ? <span className="chip">live set</span> : null}
                            <PuzzleTick id={p.id} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-dim">No puzzles at this tier yet.</p>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
