"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import type { HexCoord } from "@/lib/hex";
import { hexLabel } from "@/lib/hex";
import type { Question, Scenario } from "@/lib/scenario-schema";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import type { AugmentCard } from "@/lib/trainer-props";
import { TierBadge, UnitIcon, ItemIcon } from "@/components/set/icons";

type Choice = Extract<Question, { type: "choice" }>;
type Aug = Extract<Question, { type: "augment" }>;
type Holder = Extract<Question, { type: "item-holder" }>;
type Ordering = Extract<Question, { type: "ordering" }>;

export function ChoiceQuestion({ q, value, onChange, locked }: { q: Choice; value: string[]; onChange: (v: string[]) => void; locked: boolean }) {
  const multi = q.correct.length > 1;
  return (
    <fieldset disabled={locked}>
      <legend className="display mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">{multi ? "Pick all that apply" : "Pick one"}</legend>
      <div className="space-y-2">
        {q.options.map((o) => {
          const on = value.includes(o.id);
          const isCorrect = locked && q.correct.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id])}
              className="notch flex w-full items-center gap-2 border p-2 text-left text-sm"
              style={{
                borderColor: isCorrect ? "var(--teal)" : on ? "var(--gold)" : "var(--gold-dim)",
                background: on ? "var(--bg-raised)" : "var(--bg-panel)",
              }}
            >
              <span aria-hidden className="inline-block h-3 w-3 shrink-0 rotate-45 border border-gold" style={{ background: on ? "var(--gold)" : "transparent" }} />
              {o.icon ? <Image src={asset(o.icon)} alt="" width={20} height={20} unoptimized /> : null}
              <span>{o.label}</span>
              {isCorrect ? <span className="ml-auto text-xs text-teal">✓</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AugmentQuestion({ q, augments, value, onChange, locked }: { q: Aug; augments: Record<string, AugmentCard>; value: string | null; onChange: (v: string) => void; locked: boolean }) {
  return (
    <fieldset disabled={locked}>
      <legend className="display mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Choose an augment</legend>
      <div className="space-y-2">
        {q.options.map((id) => {
          const a = augments[id];
          const on = value === id;
          const isCorrect = locked && q.correct === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(id)}
              className="notch flex w-full gap-3 border p-2 text-left"
              style={{ borderColor: isCorrect ? "var(--teal)" : on ? "var(--gold)" : "var(--gold-dim)", background: on ? "var(--bg-raised)" : "var(--bg-panel)" }}
            >
              <ItemIcon icon={a?.icon ?? ""} name={a?.name ?? id} size={40} />
              <span className="min-w-0 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-gold-bright">{a?.name ?? id}</span>
                  {a ? <TierBadge tier={a.tier} /> : null}
                </span>
                <span className="mt-1 block whitespace-pre-line text-xs text-dim">{a?.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ItemHolderQuestion({ q, scenario, units, items, value, onChange, locked }: { q: Holder; scenario: Scenario; units: Record<string, UnitLookup>; items: Record<string, ItemLookup>; value: string | null; onChange: (v: string) => void; locked: boolean }) {
  const item = items[q.itemId];
  return (
    <fieldset disabled={locked}>
      <legend className="display mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">
        Who holds <ItemIcon icon={item?.icon ?? ""} name={item?.name ?? q.itemId} size={22} /> {item?.name ?? q.itemId}?
      </legend>
      <div className="flex flex-wrap gap-2">
        {scenario.state.board.map((u) => {
          const lk = units[u.championId];
          if (!lk) return null;
          const on = value === u.championId;
          const isCorrect = locked && q.correctUnitIds.includes(u.championId);
          return (
            <button
              key={`${u.row},${u.col}`}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(u.championId)}
              className="notch flex items-center gap-2 border px-2 py-1 text-xs"
              style={{ borderColor: isCorrect ? "var(--teal)" : on ? "var(--gold)" : "var(--gold-dim)" }}
              title={hexLabel(u)}
            >
              <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={24} />
              {lk.name}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-dim">Click a unit here or on the board.</p>
    </fieldset>
  );
}

export function OrderingQuestion({ q, value, onChange, locked }: { q: Ordering; value: number[] | null; onChange: (v: number[]) => void; locked: boolean }) {
  const order = value ?? q.steps.map((_, i) => i);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const n = [...order];
    [n[i], n[j]] = [n[j]!, n[i]!];
    onChange(n);
  };
  return (
    <fieldset disabled={locked}>
      <legend className="display mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Put the steps in order</legend>
      <ol className="space-y-1.5">
        {order.map((stepIdx, i) => {
          const isRight = locked && q.correctOrder[i] === stepIdx;
          return (
            <li key={stepIdx} className="notch flex items-center gap-2 border p-2 text-sm" style={{ borderColor: locked ? (isRight ? "var(--teal)" : "var(--red)") : "var(--gold-dim)" }}>
              <span className="display w-5 text-xs text-gold">{i + 1}</span>
              <span className="flex-1">{q.steps[stepIdx]}</span>
              <span className="flex flex-col">
                <button type="button" className="px-1 text-xs text-dim hover:text-gold-bright" aria-label={`Move step ${i + 1} up`} onClick={() => move(i, -1)}>
                  ▲
                </button>
                <button type="button" className="px-1 text-xs text-dim hover:text-gold-bright" aria-label={`Move step ${i + 1} down`} onClick={() => move(i, 1)}>
                  ▼
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {!value ? (
        <button type="button" className="btn btn-sm mt-2" onClick={() => onChange(order)}>
          This order is my answer
        </button>
      ) : null}
    </fieldset>
  );
}

export function PlacementControls({ unitName, placed, locked }: { unitName: string; placed: HexCoord | null; locked: boolean }) {
  return (
    <div className="text-sm">
      <div className="display mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Place the unit</div>
      <p className="text-dim">
        <strong className="text-gold-bright">{unitName}</strong> is on your bench. Drag it onto the board, or Tab to the board, arrow down to the bench, Enter to pick up, arrows to a hex, Enter to drop.
      </p>
      <p className="mt-2" aria-live="polite">
        {placed ? (
          <>
            Placed on <span className="text-gold-bright">{hexLabel(placed)}</span>.
          </>
        ) : locked ? null : (
          <span className="text-dim">Not placed yet.</span>
        )}
      </p>
    </div>
  );
}
