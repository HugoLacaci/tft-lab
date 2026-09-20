"use client";

import { useState } from "react";
import { project, type EconConstants, type Plan } from "@/lib/econ";
import { Panel } from "@/components/ui/Panel";

type PlanKind = "save" | "level" | "roll";

function toPlan(kind: PlanKind, opts: { purchases: number; stopAt: number; rollGold: number; floor: number }): Plan {
  if (kind === "save") return { type: "save" };
  if (kind === "level") return { type: "level", purchasesPerRound: opts.purchases, stopAtLevel: opts.stopAt };
  return { type: "roll", goldPerRound: opts.rollGold, floor: opts.floor };
}

export function EconSimulator({ k, verifiedOn, source }: { k: EconConstants; verifiedOn: string; source: string }) {
  const [stage, setStage] = useState("3-2");
  const [gold, setGold] = useState(38);
  const [level, setLevel] = useState(6);
  const [xp, setXp] = useState(4);
  const [streakType, setStreakType] = useState<"win" | "loss">("win");
  const [streakCount, setStreakCount] = useState(2);
  const [a, setA] = useState<PlanKind>("save");
  const [b, setB] = useState<PlanKind>("level");
  const [opts, setOpts] = useState({ purchases: 1, stopAt: 8, rollGold: 10, floor: 30 });

  const start = { stage, gold, level, xp, streak: { type: streakType, count: streakCount } };
  const rowsA = project(start, toPlan(a, opts), k, 5);
  const rowsB = project(start, toPlan(b, opts), k, 5);

  return (
    <div className="space-y-6">
      <Panel as="section" aria-label="Starting state" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Text label="Round" value={stage} onChange={setStage} pattern="\d-\d" />
        <Num label="Gold" value={gold} onChange={setGold} min={0} max={200} />
        <Num label="Level" value={level} onChange={setLevel} min={1} max={10} />
        <Num label="XP into level" value={xp} onChange={setXp} min={0} max={100} />
        <div>
          <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Streak</div>
          <div className="flex gap-1">
            <button type="button" className={`chip ${streakType === "win" ? "chip-active" : ""}`} onClick={() => setStreakType("win")}>
              Win
            </button>
            <button type="button" className={`chip ${streakType === "loss" ? "chip-active" : ""}`} onClick={() => setStreakType("loss")}>
              Loss
            </button>
          </div>
        </div>
        <Num label="Streak length" value={streakCount} onChange={setStreakCount} min={0} max={12} />
      </Panel>

      <Panel as="section" aria-label="Plan options" className="grid gap-3 sm:grid-cols-4">
        <Num label="XP buys per round (level plan)" value={opts.purchases} onChange={(v) => setOpts({ ...opts, purchases: v })} min={1} max={5} />
        <Num label="Stop at level" value={opts.stopAt} onChange={(v) => setOpts({ ...opts, stopAt: v })} min={2} max={10} />
        <Num label="Gold rolled per round (roll plan)" value={opts.rollGold} onChange={(v) => setOpts({ ...opts, rollGold: v })} min={2} max={60} />
        <Num label="Roll floor" value={opts.floor} onChange={(v) => setOpts({ ...opts, floor: v })} min={0} max={50} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanTable title="Plan A" kind={a} setKind={setA} rows={rowsA} />
        <PlanTable title="Plan B" kind={b} setKind={setB} rows={rowsB} />
      </div>

      <Panel>
        <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">After five rounds</div>
        <p className="mt-1 text-sm">
          Plan A ends at <strong className="text-gold-bright">{rowsA[4]?.goldEnd} gold, level {rowsA[4]?.level}</strong>; Plan B at{" "}
          <strong className="text-gold-bright">{rowsB[4]?.goldEnd} gold, level {rowsB[4]?.level}</strong>. Interest earned: A {rowsA.reduce((s, r) => s + r.interest, 0)}, B{" "}
          {rowsB.reduce((s, r) => s + r.interest, 0)}.
        </p>
        <p className="mt-2 text-[0.7rem] text-dim">
          Constants verified {verifiedOn} (
          <a href={source} target="_blank" rel="noopener noreferrer">
            source
          </a>
          ). Base income {k.baseIncome}, interest 1 per {k.interest.per} capped at {k.interest.cap}, {k.passiveXp} passive XP per round, {k.xpPerPurchase.xp} XP per {k.xpPerPurchase.gold} gold.
        </p>
      </Panel>
    </div>
  );
}

function PlanTable({ title, kind, setKind, rows }: { title: string; kind: PlanKind; setKind: (k: PlanKind) => void; rows: ReturnType<typeof project> }) {
  return (
    <Panel as="section" aria-label={title}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="display text-base text-gold-bright">{title}</span>
        {(["save", "level", "roll"] as PlanKind[]).map((p) => (
          <button key={p} type="button" className={`chip ${kind === p ? "chip-active" : ""}`} aria-pressed={kind === p} onClick={() => setKind(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Round</th>
              <th className="num">Start</th>
              <th className="num">Spent</th>
              <th className="num">Interest</th>
              <th className="num">Streak</th>
              <th className="num">End</th>
              <th className="num">Lvl</th>
              <th className="num">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stage}>
                <td>{r.stage}</td>
                <td className="num">{r.goldStart}</td>
                <td className="num">{r.spent ? `−${r.spent}` : ""}</td>
                <td className="num">+{r.interest}</td>
                <td className="num">{r.streakGold ? `+${r.streakGold}` : ""}</td>
                <td className="num text-gold-bright">{r.goldEnd}</td>
                <td className="num">{r.level}</td>
                <td className="num">
                  {r.xp}/{Number.isFinite(r.xpNeeded) ? r.xpNeeded : "max"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Num({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">
        {label}
      </label>
      <input id={id} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className="input" />
    </div>
  );
}

function Text({ label, value, onChange, pattern }: { label: string; value: string; onChange: (v: string) => void; pattern?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">
        {label}
      </label>
      <input id={id} type="text" pattern={pattern} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}
