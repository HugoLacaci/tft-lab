import { InterestTable, LevelTable, OddsTable, PoolTable } from "@/components/mdx/Tables";
import { ItemCombineMatrix } from "@/components/mdx/ItemCombineMatrix";
import { getConstants } from "@/data/constants";
import { PrintButton } from "@/components/lab/PrintButton";

export const metadata = { title: "Cheat sheet" };

const SCOUT_ROUTINE = [
  "2-1: who shares your opener; note contested carries.",
  "3-2: next opponent's frontline shape and carry hex; re-check contest before rolling.",
  "4-2: every board's level and cap; who is bleeding; assassin/AoE threats for positioning.",
  "5-1 onward: scout before every fight; position against the specific opponent.",
];

export default function CheatSheetPage() {
  const k = getConstants();
  return (
    <div className="cheatsheet">
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 portrait; }
          .cheatsheet { color: #000; font-size: 9pt; }
          .cheatsheet h1, .cheatsheet h2, .cheatsheet th { color: #000 !important; }
          .cheatsheet .panel { border: 1px solid #000; clip-path: none; background: #fff !important; }
          .cheatsheet .data-table th, .cheatsheet .data-table td { border-bottom: 1px solid #999; padding: 1px 4px; color: #000; }
          .cheatsheet a { color: #000; text-decoration: none; }
          .cheatsheet .grid { display: grid; gap: 6px; }
          .cheatsheet img { filter: grayscale(1); }
          .cheatsheet .no-print { display: none; }
        }
      `}</style>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">TFT cheat sheet</h1>
        <span className="text-xs text-dim">
          Numbers verified {k.verifiedOn}{k.stale ? " (most recent constants; live set has none yet)" : ""}. Re-verify every set.
        </span>
        <PrintButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel p-3">
          <h2 className="text-base">Shop odds by level (%)</h2>
          <OddsTable />
        </section>
        <section className="panel p-3">
          <h2 className="text-base">Pool sizes</h2>
          <PoolTable />
          <h2 className="mt-3 text-base">Interest & streak gold</h2>
          <InterestTable />
        </section>
        <section className="panel p-3">
          <h2 className="text-base">Level timings</h2>
          <LevelTable />
          <p className="mt-1 text-xs text-dim">Augment rounds: {k.augmentRounds.join(", ")}.</p>
        </section>
        <section className="panel p-3">
          <h2 className="text-base">Scout routine</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {SCOUT_ROUTINE.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h2 className="mt-4 text-base">Break 50 only when</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            <li>you are about to die (two losses left or fewer);</li>
            <li>you are hitting a rolldown you planned, with a stop condition;</li>
            <li>you have a board that wins now and the streak pays more than the interest.</li>
          </ul>
        </section>
        <section className="panel p-3 md:col-span-2">
          <h2 className="text-base">Item combine matrix</h2>
          <ItemCombineMatrix compact />
        </section>
      </div>
    </div>
  );
}
