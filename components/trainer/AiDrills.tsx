"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTrainer } from "@/lib/trainer-store";
import { missedIds, weakSpots } from "@/lib/progress";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { RANK_TIERS, tierByLevel, type Difficulty } from "@/lib/rank-tiers";
import type { Scenario } from "@/lib/scenario-schema";
import type { SessionData } from "@/lib/trainer-props";
import { AI_MODEL, describeError, estimateCost, generateDrills, readAiDrills, readApiKey, writeAiDrills, writeApiKey, type AiDrillSet, type Catalogue, type PlayerContext } from "@/lib/ai-drills";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { Legend } from "@/components/ui/Legend";
import { Session } from "./Session";
import { MiniBoard } from "./MiniBoard";

const Q_LABEL: Record<string, string> = { placement: "place a unit", swap: "swap two units", choice: "make the call", "item-holder": "who holds it", ordering: "put in order", augment: "pick the augment" };

export interface LibraryEntry { id: string; category: Scenario["category"]; prompt: string; principle: string }

export function AiDrills({ catalogue, xpNeeded, library }: { catalogue: Catalogue; xpNeeded: Record<number, number>; /** hand-written drills (id, prompt, principle) so recent misses can be described to the model */ library: LibraryEntry[] }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [set, setSet] = useState<AiDrillSet | null>(null);
  const [tier, setTier] = useState<Difficulty>(2);
  const [n, setN] = useState(5);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [play, setPlay] = useState<Scenario[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const k = readApiKey();
    if (k) {
      setKey(k);
      setSaved(true);
    }
    setSet(readAiDrills());
  }, []);

  const weak = useMemo(() => (hydrated ? weakSpots(progress) : []), [hydrated, progress]);
  const missed = useMemo(() => (hydrated ? missedIds(progress).slice(0, 6) : []), [hydrated, progress]);

  const ctx = (): PlayerContext => ({
    weak: weak.slice(0, 4),
    misses: missed
      .map((id) => library.find((d) => d.id === id) ?? set?.drills.find((d) => d.id === id))
      .filter((d): d is LibraryEntry => !!d)
      .map((d) => ({ category: d.category, prompt: d.prompt, principle: d.principle })),
    tier,
    request: request.trim() || undefined,
  });

  const save = () => {
    writeApiKey(key.trim());
    setSaved(!!key.trim());
    setError(null);
  };

  const run = async () => {
    if (!key.trim()) {
      setError("Paste an API key first.");
      return;
    }
    if (!saved) save();
    setBusy(true);
    setError(null);
    setStatus(`Writing ${n} drills with ${AI_MODEL}… this takes a minute or two.`);
    abort.current = new AbortController();
    try {
      const res = await generateDrills(key.trim(), ctx(), catalogue, n, abort.current.signal);
      const merged: AiDrillSet = {
        version: 1,
        generatedAt: new Date().toISOString(),
        focus: weak.slice(0, 2).map((w) => w.category),
        drills: [...res.drills, ...(set?.drills ?? []).filter((d) => !res.drills.some((x) => x.id === d.id))].slice(0, 40),
      };
      writeAiDrills(merged);
      setSet(merged);
      setStatus(`${res.drills.length} new drill${res.drills.length === 1 ? "" : "s"} added${res.dropped.length ? `; ${res.dropped.length} dropped by validation` : ""}. About $${estimateCost(res.usage).toFixed(2)} at list price.`);
      if (res.drills.length === 0 && res.dropped.length) setError(`Every drill failed validation: ${res.dropped.slice(0, 2).join("; ")}. Try again.`);
    } catch (e) {
      setStatus(null);
      setError(describeError(e));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const cancel = () => abort.current?.abort();

  const clear = () => {
    if (!confirm("Delete all generated drills? Your answers to them stay in your progress.")) return;
    writeAiDrills(null);
    setSet(null);
    setPlay(null);
  };

  const data: SessionData = useMemo(
    () => ({ scenarios: play ?? [], units: catalogue.units, items: catalogue.items, traitNames: catalogue.traitNames, augments: {}, xpNeeded }),
    [play, catalogue, xpNeeded],
  );

  if (play) {
    return (
      <div>
        <button type="button" className="btn btn-sm mb-4" onClick={() => setPlay(null)}>
          ← Your generated drills
        </button>
        <Session key={play.map((d) => d.id).join("|")} data={data} mode="ai" title="Made for you" backHref="/trainer/ai" backLabel="Back to your drills" />
      </div>
    );
  }

  const drills = set?.drills ?? [];
  const unsolved = drills.filter((d) => (progress.seen[d.id]?.correct ?? 0) === 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Panel className="rise" glow="rgba(198, 140, 255, 0.5)">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Your focus</div>
          {!hydrated ? (
            <p className="mt-1 text-sm text-dim">Loading…</p>
          ) : weak.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {weak.slice(0, 4).map((w) => (
                <li key={w.category} className="chip" style={w.accuracy < 0.6 ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}>
                  <Glyph name={w.category} size={12} />
                  {CATEGORY_LABELS[w.category]} · {Math.round(w.accuracy * 100)}%
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-dim">
              No weak spots measured yet: answer a few drills first (a <Link href="/trainer/daily">Daily 10</Link> is enough) and the generator will target what you miss. Until then it writes a spread of fundamentals.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-dim">
              <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Write at</span>
              <div className="flex flex-wrap gap-1.5">
                {RANK_TIERS.map((t) => (
                  <button key={t.id} type="button" className={`chip ${tier === t.level ? "chip-active" : ""}`} aria-pressed={tier === t.level} style={tier === t.level ? { color: t.color, borderColor: t.color } : undefined} onClick={() => setTier(t.level)}>
                    <RankEmblem tier={t} size={12} />
                    {t.short}
                  </button>
                ))}
              </div>
            </label>
            <label className="text-xs text-dim">
              <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">How many</span>
              <div className="flex gap-1.5">
                {[3, 5, 8].map((k) => (
                  <button key={k} type="button" className={`chip ${n === k ? "chip-active" : ""}`} aria-pressed={n === k} onClick={() => setN(k)}>
                    {k}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <label className="mt-3 block text-xs text-dim">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Anything specific? (optional)</span>
            <input className="w-full border border-[var(--gold-dim)] bg-[var(--bg-raised)] p-2 text-sm text-ink" placeholder="e.g. positioning against Kha'Zix, or econ at 4-1 with a losing board" value={request} onChange={(e) => setRequest(e.target.value)} maxLength={200} />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {busy ? (
              <button type="button" className="btn" onClick={cancel}>
                Cancel
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={run} disabled={!hydrated}>
                <Glyph name="spark" size={14} />
                Generate {n} drills
              </button>
            )}
            {status ? (
              <span className="text-xs text-dim" aria-live="polite">
                {status}
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </Panel>

        <Panel className="rise" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">API key</div>
          <p className="mt-1 text-xs text-dim">
            The drills are written by Claude ({AI_MODEL}) called straight from your browser with your own key, the same way the tracker talks to Riot. The key stays in this browser&apos;s storage and is sent only to the Claude API. Each batch costs a few cents.
          </p>
          <input className="key-input mt-2 w-full border border-[var(--gold-dim)] bg-[var(--bg-raised)] p-2 text-ink" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} aria-label="Claude API key" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm" onClick={save}>
              {saved ? "Saved" : "Save in this browser"}
            </button>
            {saved ? (
              <button type="button" className="btn btn-sm" onClick={() => { writeApiKey(""); setKey(""); setSaved(false); }}>
                Forget
              </button>
            ) : null}
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-xs">
              Get a key ↗
            </a>
          </div>
        </Panel>
      </div>

      <section aria-label="Generated drills">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Your generated drills · {drills.length}</div>
          {drills.length ? (
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setPlay(drills)}>
                Play all
              </button>
              {unsolved.length && unsolved.length < drills.length ? (
                <button type="button" className="btn btn-sm" onClick={() => setPlay(unsolved)}>
                  Play the {unsolved.length} unsolved
                </button>
              ) : null}
              <button type="button" className="btn btn-sm btn-danger" onClick={clear}>
                Delete all
              </button>
            </div>
          ) : null}
        </div>
        {drills.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drills.map((d) => {
              const seen = progress.seen[d.id];
              const t = tierByLevel(d.difficulty);
              return (
                <li key={d.id}>
                  <button type="button" className="puzzle-card panel flex h-full w-full flex-col gap-3 p-3 text-left" onClick={() => setPlay([d, ...drills.filter((x) => x.id !== d.id)])}>
                    <div className="flex justify-center overflow-hidden">
                      <MiniBoard board={d.state.board} enemyBoard={d.state.enemyBoard} units={catalogue.units} hex={d.state.enemyBoard?.length ? 14 : 18} />
                    </div>
                    <div className="min-w-0">
                      <div className="display text-sm leading-snug text-gold-bright">{d.title ?? firstSentence(d.prompt)}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="chip">
                          <Glyph name={d.category} size={12} />
                          {CATEGORY_LABELS[d.category]}
                        </span>
                        <span className="chip" style={{ color: t.color, borderColor: t.color }}>
                          {t.short}
                        </span>
                        <span className="chip">{Q_LABEL[d.question.type] ?? d.question.type}</span>
                        {seen ? (
                          seen.last ? (
                            <span className="chip" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
                              ✓ solved
                            </span>
                          ) : (
                            <span className="chip" style={{ color: "var(--red)", borderColor: "var(--red)" }}>
                              retry
                            </span>
                          )
                        ) : (
                          <span className="chip">new</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Panel className="flex flex-wrap items-center gap-4">
            <Legend name="choncc-wise" size={64} tint="#c68cff" glow="rgba(198,140,255,0.4)" />
            <p className="min-w-[14rem] flex-1 text-sm text-dim">Nothing generated yet. Paste a key, pick a tier and press Generate. The first batch takes a minute or two; the drills then live here and in your replay list until you delete them.</p>
          </Panel>
        )}
      </section>
    </div>
  );
}

function firstSentence(s: string): string {
  const f = s.split(/(?<=[.!?])\s/)[0] ?? s;
  return f.length > 70 ? `${f.slice(0, 67).trimEnd()}…` : f;
}
