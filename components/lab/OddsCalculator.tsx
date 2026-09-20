"use client";

import { useMemo, useState } from "react";
import { COSTS, type Cost } from "@/lib/costs";
import { rollProbability, simulateRolldown, slotProbability } from "@/lib/odds";
import { Panel } from "@/components/ui/Panel";

export function OddsCalculator({
  shopOdds,
  poolSize,
  distinctChampions,
  verifiedOn,
  source,
  stale,
}: {
  shopOdds: { level: number; odds: [number, number, number, number, number] }[];
  poolSize: Record<Cost, number>;
  distinctChampions: Record<Cost, number>;
  verifiedOn: string;
  source: string;
  stale: boolean;
}) {
  const [cost, setCost] = useState<Cost>(4);
  const [level, setLevel] = useState(8);
  const [taken, setTaken] = useState(2);
  const [have, setHave] = useState(1);
  const [otherTier, setOtherTier] = useState(12);
  const [gold, setGold] = useState(40);

  const k = useMemo(
    () => ({ tierOdds: shopOdds.find((r) => r.level === level)?.odds ?? [0, 0, 0, 0, 0], poolSize, distinctChampions }),
    [shopOdds, level, poolSize, distinctChampions],
  );
  const inp = { cost, level, copiesTakenByOthers: taken, copiesIHave: have, otherTierCopiesTaken: otherTier, gold };
  const p = slotProbability(inp, k);
  const result = useMemo(() => simulateRolldown(inp, k, 10_000, 42), [cost, level, taken, have, otherTier, gold, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxP = Math.max(...result.distribution, 0.01);

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Panel as="section" aria-label="Inputs" className="space-y-4">
        <Field label="Unit cost">
          <div className="flex gap-1">
            {COSTS.map((c) => (
              <button key={c} type="button" className={`chip ${cost === c ? "chip-active" : ""}`} style={{ borderColor: cost === c ? `var(--cost-${c})` : undefined }} aria-pressed={cost === c} onClick={() => setCost(c)}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Num label="Your level" value={level} min={1} max={11} onChange={setLevel} />
        <Num label="Copies held by others (or gone)" value={taken} min={0} max={poolSize[cost]} onChange={setTaken} />
        <Num label="Copies you have" value={have} min={0} max={9} onChange={setHave} />
        <Num label={`Other ${cost}-costs out of the pool`} value={otherTier} min={0} max={poolSize[cost] * distinctChampions[cost]} onChange={setOtherTier} hint="Rough count of every other unit of this tier on the seven other boards and benches." />
        <Num label="Gold to spend" value={gold} min={0} max={200} step={2} onChange={setGold} />
        <p className="text-[0.7rem] text-dim">
          Pool {poolSize[cost]} copies × {distinctChampions[cost]} distinct {cost}-costs. Odds verified {verifiedOn} (
          <a href={source} target="_blank" rel="noopener noreferrer">
            source
          </a>
          ){stale ? " · using the most recent constants file; the live set has none yet" : ""}.
        </p>
      </Panel>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="P(target in one slot)" value={pct(p)} sub={`${(p * 100).toFixed(2)}% per slot`} />
          <Stat label="P(≥1 copy per roll)" value={pct(rollProbability(p))} sub={`${result.rolls} rolls with ${gold} gold`} />
          <Stat label="Expected copies" value={result.expectedCopies.toFixed(2)} sub={`closed form ${result.expectedCopiesClosedForm.toFixed(2)}`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label={`Reach 2★ (need ${result.needTwo})`} value={pct(result.pTwoStar)} accent={result.pTwoStar >= 0.5 ? "var(--teal)" : "var(--red)"} />
          <Stat label={`Reach 3★ (need ${result.needThree})`} value={pct(result.pThreeStar)} accent={result.pThreeStar >= 0.5 ? "var(--teal)" : "var(--red)"} />
        </div>
        <Panel as="section" aria-label="Distribution of copies found">
          <div className="display mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Copies found in {result.rolls} rolls</div>
          <div className="flex items-end gap-1" style={{ height: 140 }} role="img" aria-label={result.distribution.map((d, i) => `${i} copies: ${pct(d)}`).join(", ")}>
            {result.distribution.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${i} copies: ${pct(d)}`}>
                <span className="text-[0.6rem] text-dim">{d >= 0.02 ? pct(d, 0) : ""}</span>
                <div className="w-full" style={{ height: `${(d / maxP) * 100}px`, background: i >= result.needTwo ? "var(--teal)" : "var(--gold)", minHeight: d > 0 ? 2 : 0 }} />
                <span className="text-[0.65rem] text-dim">{i}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-dim">Teal bars reach 2★. Monte-Carlo, 10,000 rolldowns, seeded (same inputs → same chart).</p>
        </Panel>
      </div>
    </div>
  );
}

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">{label}</div>
      {children}
    </div>
  );
}

function Num({ label, value, min, max, step = 1, onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; hint?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[var(--teal)]" />
        <input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className="input w-20 text-right" />
      </div>
      {hint ? <p className="mt-1 text-[0.7rem] text-dim">{hint}</p> : null}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="panel p-3">
      <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-dim">{label}</div>
      <div className="display mt-1 text-2xl" style={{ color: accent ?? "var(--gold-bright)" }}>
        {value}
      </div>
      {sub ? <div className="text-[0.7rem] text-dim">{sub}</div> : null}
    </div>
  );
}
