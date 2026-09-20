"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { CATEGORY_LABELS, SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenario-categories";
import { averagePlacement, leakFrequency, mergeRiotGames, placementDistribution, readTracker, rollingAverage, writeTracker, type GameLog, type TrackerData } from "@/lib/tracker-data";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { PlacementBars, LeakBars, RollingLine } from "./charts";
import { RiotSync } from "./RiotSync";

export interface TrackerProps {
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames: Record<string, string>;
  componentIds: string[];
}

const PLACEMENTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function Tracker({ units, items, traitNames, componentIds }: TrackerProps) {
  const [data, setData] = useState<TrackerData | null>(null);
  const [placement, setPlacement] = useState<GameLog["placement"]>(4);
  const [comp, setComp] = useState("");
  const [leak, setLeak] = useState<GameLog["leak"]>("none");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setData(readTracker()), []);

  const save = (next: TrackerData) => {
    setData(next);
    if (!writeTracker(next)) setMsg("Could not write to browser storage; this session's data will not persist.");
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const g: GameLog = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), placement, comp: comp.trim(), leak, note: note.trim() };
    save({ ...data, games: [...data.games, g] });
    setComp("");
    setNote("");
    setLeak("none");
    setMsg("Logged.");
  };

  const remove = (id: string) => data && save({ ...data, games: data.games.filter((g) => g.id !== id) });
  const tagLeak = (id: string, leak: GameLog["leak"]) => data && save({ ...data, games: data.games.map((g) => (g.id === id ? { ...g, leak } : g)) });
  const importRiot = (games: { matchId: string; at: string; placement: number; comp: string }[]) => {
    if (!data) return;
    const next = mergeRiotGames(data, games);
    if (next !== data) {
      save(next);
      setMsg(`${next.games.length - data.games.length} games added to the log from Riot.`);
    }
  };

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tft-lab-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as TrackerData;
      if (parsed?.version !== 1 || !Array.isArray(parsed.games)) throw new Error("not a tracker export");
      const merged = new Map<string, GameLog>();
      for (const g of [...(data?.games ?? []), ...parsed.games]) merged.set(g.id, g);
      save({ version: 1, games: [...merged.values()].sort((a, b) => a.at.localeCompare(b.at)) });
      setMsg(`Imported ${parsed.games.length} games (merged by id).`);
    } catch (err) {
      setMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (!data) return <p className="text-dim">Loading…</p>;
  const games = data.games;
  const avp = averagePlacement(games);
  const last20 = averagePlacement(games.slice(-20));
  const leaks = leakFrequency(games).map((l) => ({ ...l, label: CATEGORY_LABELS[l.leak as ScenarioCategory] ?? l.leak }));
  const weakest = leaks[0];

  return (
    <div className="space-y-8">
      <RiotSync units={units} items={items} traitNames={traitNames} componentIds={componentIds} onImport={importRiot} />

      <Panel as="section" aria-label="Log a game">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-[auto_1fr_1fr_auto]">
          <div>
            <div className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Placement</div>
            <div className="flex gap-1" role="group" aria-label="Placement">
              {PLACEMENTS.map((p) => (
                <button key={p} type="button" className={`chip ${placement === p ? "chip-active" : ""}`} aria-pressed={placement === p} onClick={() => setPlacement(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Comp played</span>
            <input className="input" value={comp} onChange={(e) => setComp(e.target.value)} placeholder="e.g. 4-cost AD reroll" required />
          </label>
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">One leak</span>
            <select className="input" value={leak} onChange={(e) => setLeak(e.target.value as GameLog["leak"])}>
              <option value="none">No clear leak</option>
              {SCENARIO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-3">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">One line</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="The round it was decided and the alternative" maxLength={200} />
          </label>
          <button type="submit" className="btn btn-primary self-end">
            Log game
          </button>
        </form>
        {msg ? (
          <p className="mt-2 text-xs text-dim" role="status">
            {msg}
          </p>
        ) : null}
      </Panel>

      <section className="grid gap-3 sm:grid-cols-3">
        <Tile label="Games logged" value={String(games.length)} />
        <Tile label="Average placement" value={avp === null ? "—" : avp.toFixed(2)} sub={last20 !== null && games.length > 20 ? `last 20: ${last20.toFixed(2)}` : undefined} />
        <Tile label="Weakest category" value={weakest ? weakest.label : "—"} sub={weakest ? `${weakest.count} games tagged · feeds the Daily 10` : "tag leaks to find out"} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel as="section">
          <SectionTitle kicker="Distribution">Placements</SectionTitle>
          <PlacementBars counts={placementDistribution(games)} />
        </Panel>
        <Panel as="section">
          <SectionTitle kicker="Leaks">Tagged leak frequency</SectionTitle>
          <LeakBars rows={leaks} />
          {weakest ? (
            <p className="mt-3 text-xs text-dim">
              Drill it: <Link href={`/trainer/${weakest.leak}`}>{weakest.label} scenarios</Link>.
            </p>
          ) : null}
        </Panel>
        <Panel as="section" className="lg:col-span-2">
          <SectionTitle kicker="Trend">20-game rolling average</SectionTitle>
          <RollingLine points={rollingAverage(games, 20)} />
        </Panel>
      </div>

      <section>
        <SectionTitle kicker="Log">Games</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" onClick={exportJson} disabled={!games.length}>
            Export JSON
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <span className="self-center text-xs text-dim">Data lives only in this browser. Export before clearing site data.</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Place</th>
                <th>Comp</th>
                <th>Leak</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...games].reverse().map((g) => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap text-dim">{g.at.slice(0, 10)}</td>
                  <td className="num" style={{ color: g.placement <= 4 ? "var(--teal)" : "var(--text)" }}>
                    {g.placement}
                  </td>
                  <td>
                    {g.comp}
                    {g.source === "riot" ? <span className="ml-1 text-[0.6rem] uppercase tracking-wider text-dim">riot</span> : null}
                  </td>
                  <td className="text-dim">
                    <select className="input !w-auto !py-0.5 text-xs" value={g.leak} aria-label={`Leak for game on ${g.at.slice(0, 10)}`} onChange={(e) => tagLeak(g.id, e.target.value as GameLog["leak"])}>
                      <option value="none">—</option>
                      {SCENARIO_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-dim">{g.note}</td>
                  <td>
                    <button type="button" className="text-xs text-dim hover:text-danger" aria-label={`Delete game from ${g.at.slice(0, 10)}`} onClick={() => remove(g.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {games.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-dim">
                    Nothing logged yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gold-bright">{value}</div>
      {sub ? <div className="text-[0.7rem] text-dim">{sub}</div> : null}
    </div>
  );
}
