import Link from "next/link";
import { PageTitle, Panel, SectionTitle } from "@/components/ui/Panel";
import { CIRCUIT } from "@/data/constants/circuit";
import { CURRENT_SET, isSynced } from "@/lib/current-set";

export const metadata = { title: "Compete" };

export default function CompetePage() {
  const c = CIRCUIT;
  const setLabel = isSynced() ? `Set ${CURRENT_SET.setNumber}` : "the current set";
  return (
    <div className="space-y-10">
      <PageTitle lede="The real road from ranked to the Pro Circuit, what rank you actually need, and what changes about how you play when the goal is tournament points instead of LP.">
        Compete
      </PageTitle>

      {!c.verified ? (
        <div role="status" className="panel border-l-4 border-l-danger p-4 text-sm">
          <strong className="text-gold-bright">Dates below are unverified.</strong> They were entered on {c.verifiedOn} from the project brief and have not yet been checked against the{" "}
          <a href={c.sources.esportsNews} target="_blank" rel="noopener noreferrer">
            official TFT esports pages
          </a>
          . Treat the structure as reliable and the exact windows as provisional.
        </div>
      ) : null}

      <section>
        <SectionTitle kicker="Step 1">Ranked ladder → Ladder Snapshots</SectionTitle>
        <Panel>
          <p className="text-sm">{c.ladderSnapshots.description}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {c.ladderSnapshots.times.map((t) => (
              <li key={t.region} className="chip">
                {t.region} · {t.time}
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Step 2">Tactician&apos;s Trials</SectionTitle>
        <Panel>
          <p className="text-sm">{c.trials.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.trials.events.map((e) => (
              <span key={e.name} className="chip" title={e.verified ? "verified" : "unverified"}>
                {e.name} · {e.window}
                {!e.verified ? " · ?" : ""}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">Two Trials ran in {setLabel}.</p>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Step 3">Regional Finals</SectionTitle>
        <Panel>
          <p className="text-sm">{c.regionalFinals.description}</p>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Step 4">TFT Pro Circuit</SectionTitle>
        <Panel>
          <p className="text-sm">{c.proCircuit.description}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {c.proCircuit.cups.map((cup) => (
              <div key={cup.name} className="notch border border-[var(--gold-dim)] p-3 text-sm">
                <div className="display text-gold-bright">{cup.name}</div>
                <div className="text-xs text-dim">
                  {cup.window} · {cup.prize}
                  {!cup.verified ? " · unverified" : ""}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dim">
            Results and brackets:{" "}
            <a href={c.sources.liquipedia} target="_blank" rel="noopener noreferrer">
              Liquipedia TFT
            </a>
            .
          </p>
        </Panel>
      </section>

      <section>
        <SectionTitle kicker="Honestly">What rank you actually need</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <h3 className="text-base">To see a Trials invite</h3>
            <p className="mt-2 text-sm text-dim">
              Consistent high Master or Grandmaster on your regional ladder at the snapshot, not a peak. Snapshots reward being there on the Tuesday, which means the two weeks before it are played differently: fewer experimental games, more of the two comps you can force, and no patch-day ranked.
            </p>
          </Panel>
          <Panel>
            <h3 className="text-base">What changes when points replace LP</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dim">
              <li>
                <strong className="text-ink">Snapshot metas.</strong> The lobby is eight players who all read the same stats page. Contest is heavier and pivots happen earlier; the flex opener is worth more than the best comp.
              </li>
              <li>
                <strong className="text-ink">1st vs top 4.</strong> In a points format a 4th and a 5th are close; a 1st and an 8th are not. You play for the placement the board can reach, and in checkmate lobbies you may need the win, which changes the 4-2 decision completely.
              </li>
              <li>
                <strong className="text-ink">A narrow book.</strong> Prepare two or three comps you can force from most openers, with their positioning and item paths memorised, rather than the whole meta at 60%.
              </li>
            </ul>
          </Panel>
        </div>
        <p className="mt-4 text-sm text-dim">
          The <Link href="/routine">routine</Link> and the <Link href="/tracker">tracker</Link> are how you find out whether you are consistent enough to be there on the Tuesday.
        </p>
      </section>
    </div>
  );
}
