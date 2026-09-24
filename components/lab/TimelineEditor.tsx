"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/board/Board";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";
import { asset } from "@/lib/asset";
import type { HexCoord } from "@/lib/hex";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { fmtStamp, type Study } from "@/lib/study-schema";
import { readJson, writeJson } from "@/lib/storage";
import { DEFAULT_RULES, deriveDecisions, validateTimeline, type BenchUnit, type EconRules, type GameTimeline, type IncomeEvent, type PlacedUnit, type RoundState } from "@/packages/ontology/ts";
import { StudyPlayer, type SeekRequest } from "./StudyPlayer";

/**
 * Annotation editor: build a GameTimeline for a Study Hall VOD by hand,
 * state by state, with the video beside the form. Every state is validated
 * against the ontology as you type and the accounting equation runs live, so
 * a misread gold value or a forgotten buy shows up immediately as a residual.
 * The draft lives in this browser; Export writes the JSON that goes into
 * content/timelines/<matchId>.json.
 */
export interface EditorCatalog {
  setNumber: number;
  patch: string;
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames: Record<string, string>;
  augments: { id: string; name: string; tier: string; icon: string }[];
  recipes: Record<string, string[]>;
  xpToLevel: { level: number; xp: number }[];
  interest: { per: number; cap: number };
  xpPerPurchase: { xp: number; gold: number };
  passiveXp: number;
}

const DRAFT = (id: string) => `tftlab.timeline-draft.v1:${id}`;
const PHASES: RoundState["phase"][] = ["planning", "combat", "carousel", "augment-select", "unknown"];
const EVENT_KINDS: IncomeEvent["kind"][] = ["pve-drop", "augment", "wisp", "carousel", "other"];

function blankState(matchId: string, prev?: RoundState): RoundState {
  if (prev) {
    const copy = structuredClone(prev);
    copy.phaseMoment = prev.phaseMoment === "start" ? "end" : "start";
    if (copy.phaseMoment === "start") {
      // next round: bump the round number, clear per-round extras
      const [s, r] = prev.stage.split("-").map(Number);
      const nr = (r ?? 1) + 1;
      copy.stage = nr > 7 ? `${(s ?? 2) + 1}-1` : `${s}-${nr}`;
      copy.stageNumber = Number(copy.stage.split("-")[0]);
      copy.roundNumber = Number(copy.stage.split("-")[1]);
      copy.phase = "planning";
      delete copy.augmentOptions;
      delete copy.incomeEvents;
      delete copy.opponentPreview;
      delete copy.videoTimestampMs;
      copy.shop = [null, null, null, null, null];
    }
    return copy;
  }
  return {
    matchId,
    stage: "2-1",
    stageNumber: 2,
    roundNumber: 1,
    phase: "planning",
    phaseMoment: "start",
    gold: 0,
    health: 100,
    level: 3,
    xp: { current: 0, needed: 10 },
    streak: { type: "win", count: 0 },
    board: [],
    bench: [],
    shop: [null, null, null, null, null],
    benchItems: [],
    activeTraits: [],
    augments: [],
    confidence: {},
    provenance: "manual",
  };
}

export function TimelineEditor({ study, catalog, initial }: { study: Study; catalog: EditorCatalog; initial?: GameTimeline }) {
  const matchId = initial?.matchId ?? `study-${study.id}`;
  const [tl, setTl] = useState<GameTimeline>(() => initial ?? { matchId, setNumber: catalog.setNumber, patch: study.patch ?? catalog.patch, source: "annotation", studyId: study.id, sourceUrl: `https://www.youtube.com/watch?v=${study.video.id}`, playerName: study.player.name, title: study.title, rounds: [blankState(matchId)], annotatedBy: "" });
  const [idx, setIdx] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [current, setCurrent] = useState(0);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [sel, setSel] = useState<HexCoord | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Draft persistence.
  useEffect(() => {
    const d = readJson<GameTimeline | null>(DRAFT(study.id), null);
    if (d && d.rounds?.length) {
      setTl(d);
      setIdx(d.rounds.length - 1);
    }
    setHydrated(true);
  }, [study.id]);
  useEffect(() => {
    if (hydrated) writeJson(DRAFT(study.id), tl);
  }, [tl, hydrated, study.id]);

  const rules: EconRules = useMemo(
    () => ({ ...DEFAULT_RULES, interest: catalog.interest, xpPerPurchase: catalog.xpPerPurchase, passiveXp: catalog.passiveXp, costOf: (id) => catalog.units[id]?.cost, recipeOf: (id) => catalog.recipes[id] }),
    [catalog],
  );
  const check = useMemo(() => validateTimeline(tl), [tl]);
  const decisions = useMemo(() => {
    try {
      return deriveDecisions(tl, rules);
    } catch {
      return [];
    }
  }, [tl, rules]);

  const s = tl.rounds[idx]!;
  const patch = (fn: (r: RoundState) => void) =>
    setTl((t) => {
      const rounds = t.rounds.map((r, i) => (i === idx ? structuredClone(r) : r));
      fn(rounds[idx]!);
      const r = rounds[idx]!;
      const [sn, rn] = r.stage.split("-").map(Number);
      r.stageNumber = sn || r.stageNumber;
      r.roundNumber = rn || r.roundNumber;
      r.xp.needed = catalog.xpToLevel.find((x) => x.level === r.level)?.xp ?? r.xp.needed;
      r.activeTraits = activeTraits(r.board, catalog);
      return { ...t, rounds };
    });
  const patchMeta = (fn: (t: GameTimeline) => void) =>
    setTl((t) => {
      const c = structuredClone(t);
      fn(c);
      return c;
    });

  const addAfter = () => {
    setTl((t) => {
      const rounds = [...t.rounds];
      rounds.splice(idx + 1, 0, blankState(t.matchId, t.rounds[idx]));
      return { ...t, rounds };
    });
    setIdx(idx + 1);
  };
  const remove = () => {
    if (tl.rounds.length <= 1) return;
    setTl((t) => ({ ...t, rounds: t.rounds.filter((_, i) => i !== idx) }));
    setIdx(Math.max(0, idx - 1));
  };

  const exportJson = () => {
    const text = JSON.stringify(tl, null, 2) + "\n";
    setExported(text);
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tl.matchId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f: File) => {
    const parsed = validateTimeline(JSON.parse(await f.text()));
    if (!parsed.ok) {
      alert(`Not a valid timeline:\n${parsed.errors.slice(0, 5).join("\n")}`);
      return;
    }
    setTl(parsed.value);
    setIdx(0);
  };

  const selUnit = sel ? s.board.find((u) => u.row === sel.row && u.col === sel.col) : undefined;
  const into = idx > 0 ? decisions[idx - 1] : undefined;
  const errorsHere = check.ok ? [] : check.errors.filter((e) => e.startsWith(`/rounds/${idx}/`) || e.startsWith(`/rounds/${idx} `));

  if (!hydrated) return <p className="text-dim">Loading…</p>;

  return (
    <div className="space-y-4">
      <Panel as="section" aria-label="Timeline meta">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Match id">
            <input className="inp" value={tl.matchId} onChange={(e) => patchMeta((t) => { t.matchId = e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase(); for (const r of t.rounds) r.matchId = t.matchId; })} />
          </Field>
          <Field label="Patch">
            <input className="inp" value={tl.patch} onChange={(e) => patchMeta((t) => { t.patch = e.target.value; })} />
          </Field>
          <Field label="Final placement">
            <input className="inp" type="number" min={1} max={8} value={tl.finalPlacement ?? ""} onChange={(e) => patchMeta((t) => { const v = Number(e.target.value); if (v >= 1 && v <= 8) t.finalPlacement = v; else delete t.finalPlacement; })} />
          </Field>
          <Field label="Annotated by">
            <input className="inp" value={tl.annotatedBy ?? ""} onChange={(e) => patchMeta((t) => { t.annotatedBy = e.target.value; })} placeholder="your name or handle" />
          </Field>
        </div>
        <Field label="Notes" className="mt-3">
          <input className="inp" value={tl.notes ?? ""} onChange={(e) => patchMeta((t) => { t.notes = e.target.value; })} placeholder="what this game is, in one line" />
        </Field>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-4">
          <StudyPlayer videoId={study.video.id} title={study.video.title} length={study.video.length} channel={study.video.channel} publishedOn={study.video.publishedOn} seek={seek} onTime={setCurrent} />

          <Panel as="section" aria-label="States">
            <div className="flex flex-wrap items-center gap-2">
              <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">States · {tl.rounds.length}</div>
              <span className={`chip ${check.ok ? "" : ""}`} style={check.ok ? { color: "var(--teal)", borderColor: "var(--teal)" } : { color: "var(--red)", borderColor: "var(--red)" }}>
                {check.ok ? "valid timeline" : `${check.errors.length} schema problem${check.errors.length === 1 ? "" : "s"}`}
              </span>
              <span className="chip" style={decisions.some((d) => d.lowConfidence) ? { color: "var(--red)", borderColor: "var(--red)" } : { color: "var(--teal)", borderColor: "var(--teal)" }}>
                {decisions.filter((d) => d.lowConfidence).length} unbalanced
              </span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <button type="button" className="btn btn-sm btn-primary" onClick={addAfter}>
                  + State after (copies this one)
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={tl.rounds.length <= 1}>
                  Delete
                </button>
                <button type="button" className="btn btn-sm" onClick={exportJson}>
                  Export JSON
                </button>
                <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                  Import
                </button>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
                <button type="button" className="btn btn-sm" onClick={() => { if (confirm("Discard the draft in this browser?")) { writeJson(DRAFT(study.id), null); location.reload(); } }}>
                  Reset
                </button>
              </div>
            </div>
            <ol className="ribbon mt-3" aria-label="States">
              {tl.rounds.map((r, i) => {
                const d = i > 0 ? decisions[i - 1] : undefined;
                const color = d?.lowConfidence ? "var(--red)" : "var(--teal)";
                return (
                  <li key={i} className={`ribbon-seg ${i === idx ? "ribbon-active" : ""}`} style={{ ["--seg" as string]: color } as React.CSSProperties}>
                    <button type="button" className="ribbon-btn" onClick={() => { setIdx(i); setSel(null); }} aria-pressed={i === idx}>
                      <span className="ribbon-bar" />
                      <span className="ribbon-label">
                        {r.stage}
                        {r.phaseMoment === "end" ? "e" : "s"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {!check.ok ? (
              <ul className="mt-2 list-disc pl-5 text-xs text-danger">
                {check.errors.slice(0, 6).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <div className="panel p-2 sm:p-4">
            <Board
              key={idx}
              mode="own"
              board={s.board}
              bench={s.bench}
              shop={s.shop}
              status={{ gold: s.gold, hp: s.health, level: s.level, xpToNext: s.xp.needed - s.xp.current, xpNeeded: s.xp.needed, stage: s.stage, streak: s.streak, items: s.benchItems }}
              units={catalog.units}
              items={catalog.items}
              traitNames={catalog.traitNames}
              onChange={(n) => patch((r) => { r.board = n.board; r.bench = n.bench; })}
              onCellClick={(side, hex) => { if (side === "own") setSel(hex); }}
              selected={sel ? { side: "own", hex: sel } : null}
              onRemoveUnit={(_, hex) => patch((r) => { r.board = r.board.filter((u) => !(u.row === hex.row && u.col === hex.col)); })}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Add a unit to the bench</div>
                <EntityPicker options={Object.values(catalog.units).filter((u) => !u.id.startsWith("generic:")).map((u) => ({ id: u.id, name: u.name, sub: `${u.cost}-cost`, icon: u.icon }))} placeholder="champion name…" onPick={(id) => patch((r) => { if (r.bench.length < 9) r.bench = [...r.bench, { championId: id, star: 1, items: [] }]; })} />
                <p className="mt-1 text-[0.7rem] text-dim">Drag it onto the board. Click a board unit to set stars and items; ✕ removes it.</p>
              </div>
              <div>
                <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">{selUnit ? `${catalog.units[selUnit.championId]?.name ?? selUnit.championId} at (${selUnit.row},${selUnit.col})` : "Select a board unit"}</div>
                {selUnit ? (
                  <div className="mt-1 space-y-2">
                    <div className="flex gap-1.5">
                      {([1, 2, 3] as const).map((st) => (
                        <button key={st} type="button" className={`chip ${selUnit.star === st ? "chip-active" : ""}`} onClick={() => patch((r) => { const u = r.board.find((x) => x.row === selUnit.row && x.col === selUnit.col); if (u) u.star = st; })}>
                          {st}★
                        </button>
                      ))}
                    </div>
                    <ItemSlots items={selUnit.items} catalog={catalog} onChange={(items) => patch((r) => { const u = r.board.find((x) => x.row === selUnit.row && x.col === selUnit.col); if (u) u.items = items; })} />
                  </div>
                ) : null}
              </div>
            </div>
            <BenchEditor bench={s.bench} catalog={catalog} onChange={(bench) => patch((r) => { r.bench = bench; })} />
          </div>
        </div>

        <div className="space-y-4">
          <Panel as="section" aria-label="State fields">
            <div className="flex flex-wrap items-center gap-2">
              <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">State {idx + 1}</div>
              <button type="button" className="chip chip-active tabular-nums" title="Stamp this state with the video position" onClick={() => patch((r) => { r.videoTimestampMs = Math.round(current * 1000); })}>
                ⏱ stamp {fmtStamp(current)}
              </button>
              {s.videoTimestampMs !== undefined ? (
                <button type="button" className="chip tabular-nums" onClick={() => setSeek((q) => ({ sec: s.videoTimestampMs! / 1000, n: (q?.n ?? 0) + 1 }))}>
                  ▶ {fmtStamp(s.videoTimestampMs / 1000)}
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Field label="Stage">
                <input className="inp" value={s.stage} onChange={(e) => patch((r) => { r.stage = e.target.value; })} placeholder="3-2" />
              </Field>
              <Field label="Moment">
                <select className="inp" value={s.phaseMoment ?? "start"} onChange={(e) => patch((r) => { r.phaseMoment = e.target.value as "start" | "end"; })}>
                  <option value="start">start (shop known)</option>
                  <option value="end">end (final board)</option>
                </select>
              </Field>
              <Field label="Phase">
                <select className="inp" value={s.phase} onChange={(e) => patch((r) => { r.phase = e.target.value as RoundState["phase"]; })}>
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gold">
                <input className="inp" type="number" min={0} value={s.gold} onChange={(e) => patch((r) => { r.gold = Number(e.target.value); })} />
              </Field>
              <Field label="HP">
                <input className="inp" type="number" min={0} max={150} value={s.health} onChange={(e) => patch((r) => { r.health = Number(e.target.value); })} />
              </Field>
              <Field label="Level">
                <input className="inp" type="number" min={1} max={11} value={s.level} onChange={(e) => patch((r) => { r.level = Number(e.target.value); })} />
              </Field>
              <Field label={`XP (of ${s.xp.needed})`}>
                <input className="inp" type="number" min={0} value={s.xp.current} onChange={(e) => patch((r) => { r.xp.current = Number(e.target.value); })} />
              </Field>
              <Field label="Streak">
                <select className="inp" value={s.streak.type} onChange={(e) => patch((r) => { r.streak.type = e.target.value as "win" | "loss"; })}>
                  <option value="win">win</option>
                  <option value="loss">loss</option>
                </select>
              </Field>
              <Field label="Streak count">
                <input className="inp" type="number" min={0} value={s.streak.count} onChange={(e) => patch((r) => { r.streak.count = Number(e.target.value); })} />
              </Field>
              <Field label="Gold confidence">
                <input className="inp" type="number" min={0} max={1} step={0.1} value={s.confidence.gold ?? 1} onChange={(e) => patch((r) => { const v = Number(e.target.value); if (v >= 1) delete r.confidence.gold; else r.confidence.gold = v; })} />
              </Field>
              <Field label="Provenance">
                <select className="inp" value={s.provenance} onChange={(e) => patch((r) => { r.provenance = e.target.value as RoundState["provenance"]; })}>
                  <option value="manual">manual</option>
                  <option value="vision">vision</option>
                </select>
              </Field>
            </div>
            {errorsHere.length ? (
              <ul className="mt-2 list-disc pl-5 text-xs text-danger">
                {errorsHere.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel as="section" aria-label="Shop">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Shop (5 slots)</div>
            <div className="mt-2 space-y-1.5">
              {s.shop.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="display w-4 text-xs text-gold">{i + 1}</span>
                  {slot ? (
                    <span className="chip flex-1">
                      {catalog.units[slot]?.name ?? slot}
                      <button type="button" className="ml-auto text-dim hover:text-danger" aria-label="Clear slot" onClick={() => patch((r) => { r.shop[i] = null; })}>
                        ✕
                      </button>
                    </span>
                  ) : (
                    <EntityPicker className="flex-1" options={Object.values(catalog.units).filter((u) => !u.id.startsWith("generic:")).map((u) => ({ id: u.id, name: u.name, sub: `${u.cost}g`, icon: u.icon }))} placeholder="empty…" onPick={(id) => patch((r) => { r.shop[i] = id; })} />
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel as="section" aria-label="Items and augments">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Bench items</div>
            <ChipList ids={s.benchItems} name={(id) => catalog.items[id]?.name ?? id} onRemove={(i) => patch((r) => { r.benchItems.splice(i, 1); })} />
            <EntityPicker className="mt-1" options={Object.values(catalog.items).filter((i) => !i.id.startsWith("generic:")).map((i) => ({ id: i.id, name: i.name, sub: i.kind, icon: i.icon }))} placeholder="add component or item…" onPick={(id) => patch((r) => { r.benchItems = [...r.benchItems, id]; })} />

            <div className="display mt-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Augments held</div>
            <ChipList ids={s.augments} name={(id) => catalog.augments.find((a) => a.id === id)?.name ?? id} onRemove={(i) => patch((r) => { r.augments.splice(i, 1); })} />
            <EntityPicker className="mt-1" options={catalog.augments.map((a) => ({ id: a.id, name: a.name, sub: a.tier, icon: a.icon }))} placeholder="add augment…" onPick={(id) => patch((r) => { if (!r.augments.includes(id)) r.augments = [...r.augments, id]; })} />

            <div className="display mt-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Augments offered (this round)</div>
            <ChipList ids={s.augmentOptions ?? []} name={(id) => catalog.augments.find((a) => a.id === id)?.name ?? id} onRemove={(i) => patch((r) => { r.augmentOptions?.splice(i, 1); if (!r.augmentOptions?.length) delete r.augmentOptions; })} />
            <EntityPicker className="mt-1" options={catalog.augments.map((a) => ({ id: a.id, name: a.name, sub: a.tier, icon: a.icon }))} placeholder="add offered augment…" onPick={(id) => patch((r) => { r.augmentOptions = [...(r.augmentOptions ?? []), id]; r.phase = "augment-select"; })} />
          </Panel>

          <Panel as="section" aria-label="Income events and lobby">
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Income events (gold that is not base, interest or streak)</div>
            <ul className="mt-1 space-y-1">
              {(s.incomeEvents ?? []).map((ev, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs">
                  <select className="inp w-28" value={ev.kind} onChange={(e) => patch((r) => { r.incomeEvents![i]!.kind = e.target.value as IncomeEvent["kind"]; })}>
                    {EVENT_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input className="inp w-16" type="number" value={ev.gold} onChange={(e) => patch((r) => { r.incomeEvents![i]!.gold = Number(e.target.value); })} />
                  <input className="inp flex-1" value={ev.note ?? ""} placeholder="note" onChange={(e) => patch((r) => { r.incomeEvents![i]!.note = e.target.value; })} />
                  <button type="button" className="text-dim hover:text-danger" aria-label="Remove event" onClick={() => patch((r) => { r.incomeEvents!.splice(i, 1); if (!r.incomeEvents!.length) delete r.incomeEvents; })}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-sm mt-1" onClick={() => patch((r) => { r.incomeEvents = [...(r.incomeEvents ?? []), { kind: "pve-drop", gold: 0 }]; })}>
              + event
            </button>
            <p className="mt-1 text-[0.7rem] text-dim">A carousel unit: add the unit to the bench and an event of kind carousel with the unit&apos;s cost, so the accounting closes.</p>

            <div className="display mt-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold">Lobby (optional)</div>
            <ul className="mt-1 space-y-1">
              {(s.lobby ?? []).map((p, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs">
                  <input className="inp flex-1" value={p.playerName} onChange={(e) => patch((r) => { r.lobby![i]!.playerName = e.target.value; })} />
                  <input className="inp w-16" type="number" value={p.health} onChange={(e) => patch((r) => { r.lobby![i]!.health = Number(e.target.value); })} />
                  <input className="inp w-14" type="number" value={p.level ?? ""} placeholder="lvl" onChange={(e) => patch((r) => { const v = Number(e.target.value); if (v) r.lobby![i]!.level = v; else delete r.lobby![i]!.level; })} />
                  <button type="button" className="text-dim hover:text-danger" aria-label="Remove player" onClick={() => patch((r) => { r.lobby!.splice(i, 1); if (!r.lobby!.length) delete r.lobby; })}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-sm mt-1" onClick={() => patch((r) => { r.lobby = [...(r.lobby ?? []), { playerName: `Seat ${(r.lobby?.length ?? 0) + 1}`, health: 100 }]; })}>
              + player
            </button>
          </Panel>

          <Panel as="section" aria-label="Live accounting" glow={into?.lowConfidence ? "var(--red)" : "var(--teal)"}>
            <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Accounting into this state</div>
            {!into ? (
              <p className="mt-1 text-xs text-dim">First state: nothing to reconcile yet.</p>
            ) : (
              <div className="mt-1 text-xs">
                <p>
                  {into.goldStart}
                  {into.income ? ` + ${into.income}${into.incomeEstimated ? " (est. income)" : ""}` : ""} − {into.goldSpent} = {into.goldEnd}
                  {into.residual ? ` · residual ${into.residual}` : " · balanced"}
                </p>
                <p className="mt-1 text-dim">
                  {into.rolls} roll{into.rolls === 1 ? "" : "s"} · {into.xpBought} XP buy{into.xpBought === 1 ? "" : "s"}
                  {into.bought.length ? ` · bought ${into.bought.map((b) => `${catalog.units[b.championId]?.name ?? b.championId}${b.copies > 1 ? `×${b.copies}` : ""}`).join(", ")}` : ""}
                  {into.sold.length ? ` · sold ${into.sold.map((b) => catalog.units[b.championId]?.name ?? b.championId).join(", ")}` : ""}
                </p>
                {into.notes?.length ? (
                  <ul className="mt-1 list-disc pl-4 text-danger">
                    {into.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </Panel>

          {exported ? (
            <Panel>
              <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Exported</div>
              <p className="mt-1 text-xs text-dim">
                Save the downloaded file as <code>content/timelines/{tl.matchId}.json</code> and run <code>npm run validate</code>. It then appears under this study&apos;s Timeline tab.
              </p>
              <textarea className="inp mt-2 h-32 w-full font-mono text-[0.65rem]" readOnly value={exported} onFocus={(e) => e.currentTarget.select()} />
            </Panel>
          ) : null}
          <p className="text-[0.7rem] text-dim">
            <Glyph name="hint" size={11} className="inline text-gold" /> Two states per round: a start (after income, shop visible) and an end (final board before combat). The draft is kept in this browser. <Link href={`/lab/study-hall/${study.id}`}>Back to the study</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function activeTraits(board: PlacedUnit[], catalog: EditorCatalog): RoundState["activeTraits"] {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const u of board) {
    if (seen.has(u.championId)) continue;
    seen.add(u.championId);
    for (const t of catalog.units[u.championId]?.traits ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= 2).map(([traitId, count]) => ({ traitId, count, style: "unknown" })).sort((a, b) => a.traitId.localeCompare(b.traitId));
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs text-dim ${className}`}>
      <span className="display mb-0.5 block text-[0.6rem] uppercase tracking-[0.2em] text-gold">{label}</span>
      {children}
    </label>
  );
}

function ChipList({ ids, name, onRemove }: { ids: string[]; name: (id: string) => string; onRemove: (i: number) => void }) {
  if (!ids.length) return <p className="mt-1 text-[0.7rem] text-dim">none</p>;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {ids.map((id, i) => (
        <li key={`${id}-${i}`} className="chip">
          {name(id)}
          <button type="button" className="ml-1 text-dim hover:text-danger" aria-label={`Remove ${name(id)}`} onClick={() => onRemove(i)}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemSlots({ items, catalog, onChange }: { items: string[]; catalog: EditorCatalog; onChange: (items: string[]) => void }) {
  return (
    <div>
      <ChipList ids={items} name={(id) => catalog.items[id]?.name ?? id} onRemove={(i) => onChange(items.filter((_, j) => j !== i))} />
      {items.length < 3 ? <EntityPicker className="mt-1" options={Object.values(catalog.items).filter((i) => !i.id.startsWith("generic:")).map((i) => ({ id: i.id, name: i.name, sub: i.kind, icon: i.icon }))} placeholder="add item to this unit…" onPick={(id) => onChange([...items, id])} /> : null}
    </div>
  );
}

function BenchEditor({ bench, catalog, onChange }: { bench: BenchUnit[]; catalog: EditorCatalog; onChange: (b: BenchUnit[]) => void }) {
  if (!bench.length) return null;
  return (
    <div className="mt-3">
      <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Bench units</div>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {bench.map((u, i) => (
          <li key={i} className="chip">
            {catalog.units[u.championId]?.name ?? u.championId}
            <button type="button" className="ml-1 text-gold-bright" title="cycle stars" onClick={() => onChange(bench.map((b, j) => (j === i ? { ...b, star: (b.star === 3 ? 1 : b.star + 1) as 1 | 2 | 3 } : b)))}>
              {u.star}★
            </button>
            <button type="button" className="ml-1 text-dim hover:text-danger" aria-label="Remove from bench" onClick={() => onChange(bench.filter((_, j) => j !== i))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small searchable picker: type, pick from the top matches. */
export function EntityPicker({ options, placeholder, onPick, className = "" }: { options: { id: string; name: string; sub?: string; icon?: string }[]; placeholder: string; onPick: (id: string) => void; className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return options.filter((o) => o.name.toLowerCase().includes(n) || o.id.toLowerCase().includes(n)).slice(0, 8);
  }, [q, options]);
  return (
    <div className={`relative ${className}`}>
      <input className="inp w-full" value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { onPick(hits[0].id); setQ(""); } }} />
      {open && hits.length ? (
        <ul className="absolute left-0 right-0 top-full z-20 max-h-56 overflow-auto border border-[var(--gold)] bg-[var(--bg-panel)] text-xs shadow-lg">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[var(--bg-raised)]" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(h.id); setQ(""); setOpen(false); }}>
                {h.icon ? <Image src={asset(h.icon)} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] object-cover" /> : null}
                <span className="text-ink">{h.name}</span>
                {h.sub ? <span className="ml-auto text-dim">{h.sub}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
