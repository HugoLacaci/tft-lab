import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisView } from "@/components/analysis/AnalysisView";
import { loadTimelines, timelineById } from "@/lib/analysis-server";
import { itemLookup, traitLookup, unitLookup, loadSetData } from "@/lib/set-data";
import { GENERIC_ITEMS, GENERIC_UNITS } from "@/data/archetypes";
import { getConstants } from "@/data/constants";
import { DEFAULT_RULES, deriveDecisions, type EconRules } from "@/packages/ontology/ts";

export function generateStaticParams() {
  return loadTimelines().map((t) => ({ matchId: t.matchId }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const t = timelineById(matchId);
  return { title: t ? `${t.title ?? t.matchId} · Analysis` : "Analysis", description: t?.notes };
}

export default async function AnalysisPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const t = timelineById(matchId);
  if (!t) notFound();
  const units = { ...GENERIC_UNITS, ...unitLookup() };
  const items = { ...GENERIC_ITEMS, ...itemLookup() };
  const traitNames = Object.fromEntries(Object.values(traitLookup()).map((x) => [x.id, x.name]));
  const augmentNames = Object.fromEntries((loadSetData()?.augments ?? []).map((a) => [a.id, a.name]));
  const recipes: Record<string, string[]> = Object.fromEntries((loadSetData()?.items ?? []).filter((i) => i.composition.length === 2).map((i) => [i.id, i.composition]));
  const k = getConstants(t.setNumber);
  const xpNeeded = Object.fromEntries(k.xpToLevel.map((r) => [r.level - 1, r.xp]));
  const rules: EconRules = {
    ...DEFAULT_RULES,
    interest: k.interest,
    xpPerPurchase: k.xpPerPurchase,
    passiveXp: k.passiveXp,
    costOf: (id) => units[id]?.cost,
    recipeOf: (id) => recipes[id],
  };
  const decisions = deriveDecisions(t, rules);
  const low = decisions.filter((d) => d.lowConfidence).length;
  const last = t.rounds[t.rounds.length - 1];
  return (
    <div>
      <div className="mb-6">
        <Link href="/analysis" className="text-xs">
          ← Analysis
        </Link>
        <div className="display mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">
          {t.source} · patch {t.patch}
          {t.playerName ? ` · ${t.playerName}` : ""}
          {t.finalPlacement ? ` · finished ${ordinal(t.finalPlacement)}` : ""}
        </div>
        <h1 className="text-2xl sm:text-3xl">{t.title ?? t.matchId}</h1>
        {t.notes ? <p className="mt-2 max-w-3xl text-sm text-dim">{t.notes}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="chip">{t.rounds.length} states</span>
          <span className="chip">{t.rounds[0]?.stage} → {last?.stage}</span>
          <span className="chip">{decisions.length} decisions</span>
          <span className="chip" style={low ? { color: "var(--red)", borderColor: "var(--red)" } : { color: "var(--teal)", borderColor: "var(--teal)" }}>
            {low ? `${low} low-confidence` : "accounting closed on every round"}
          </span>
        </div>
      </div>
      <AnalysisView timeline={t} decisions={decisions} units={units} items={items} traitNames={traitNames} xpNeeded={xpNeeded} augmentNames={augmentNames} />
    </div>
  );
}

function ordinal(n: number): string {
  return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
}
