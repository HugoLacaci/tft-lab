"use client";

/**
 * Riot ID → match history → analysis. Runs entirely in the browser with the
 * user's own API key (stored in localStorage, sent only to api.riotgames.com).
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { ItemIcon, UnitIcon } from "@/components/set/icons";
import { writeFocus } from "@/lib/focus";
import { analyze, categoryLabel, DIMENSIONS, prettyId, reviewGame, toGame, type Finding, type Report, type RiotGame } from "@/lib/riot/analyze";
import { RiotClient, RiotError, parseRiotId } from "@/lib/riot/client";
import { buildExercises, type Exercise } from "@/lib/riot/exercises";
import { mergeGames, readRiot, writeRiot, type RiotStore } from "@/lib/riot/store";
import { PLATFORMS, type Platform } from "@/lib/riot/types";
import { CATEGORY_LABELS, type ScenarioCategory } from "@/lib/scenario-categories";
import type { ItemLookup, UnitLookup } from "@/lib/set-data";
import { readJson, writeJson } from "@/lib/storage";
import { PlacementBars } from "./charts";
import { Radar } from "./Radar";

export interface RiotSyncProps {
  units: Record<string, UnitLookup>;
  items: Record<string, ItemLookup>;
  traitNames: Record<string, string>;
  componentIds: string[];
  /** Called with every cached game after a fetch so the tracker log can merge them. */
  onImport: (games: RiotGame[]) => void;
}

const COUNTS = [20, 40, 60, 100];
const EX_KEY = "tftlab.exercises.v1";

export function RiotSync({ units, items, traitNames, componentIds, onImport }: RiotSyncProps) {
  const [store, setStore] = useState<RiotStore | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState("");
  const [count, setCount] = useState(40);
  const [rankedOnly, setRankedOnly] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [focusMsg, setFocusMsg] = useState("");

  useEffect(() => {
    setStore(readRiot());
  }, []);

  const unitById = useMemo(() => {
    const m = new Map<string, UnitLookup>();
    for (const u of Object.values(units)) m.set(u.id.toLowerCase(), u);
    return m;
  }, [units]);
  const itemById = useMemo(() => {
    const m = new Map<string, ItemLookup>();
    for (const i of Object.values(items)) m.set(i.id.toLowerCase(), i);
    return m;
  }, [items]);
  const unit = (id: string) => unitById.get(id.toLowerCase());
  const item = (id: string) => itemById.get(id.toLowerCase());
  const unitName = (id: string) => unit(id)?.name ?? prettyId(id);
  const traitName = (id: string) => traitNames[id] ?? prettyId(id);
  const compIds = useMemo(() => new Set(componentIds), [componentIds]);

  const games = useMemo(() => (store ? store.games.filter((g) => !rankedOnly || g.queue === 1100) : []), [store, rankedOnly]);
  const report: Report | null = useMemo(() => (games.length ? analyze(games, { componentIds: compIds, unitName }) : null), [games, compIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const exercises = useMemo(() => (report ? buildExercises(games, report, { componentIds: compIds, unitName, traitName }) : []), [games, report, compIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (next: RiotStore) => {
    setStore(next);
    writeRiot(next);
  };

  const fetchGames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setErr("");
    const rid = parseRiotId(store.riotId);
    if (!rid) {
      setErr("Riot ID must look like Name#TAG.");
      return;
    }
    if (!store.apiKey.trim()) {
      setErr("Paste your API key from developer.riotgames.com (a development key works; it expires every 24 h).");
      return;
    }
    setBusy(true);
    try {
      const client = new RiotClient({ apiKey: store.apiKey, platform: store.platform });
      setProgress("Resolving Riot ID…");
      const acc = await client.accountByRiotId(rid.gameName, rid.tagLine);
      setProgress("Reading rank…");
      const league = await client.leagueByPuuid(acc.puuid);
      const ranked = league.find((l) => l.queueType === "RANKED_TFT");
      const rank = ranked ? `${cap(ranked.tier ?? "")} ${ranked.rank ?? ""} · ${ranked.leaguePoints ?? 0} LP · ${ranked.wins ?? 0}W ${ranked.losses ?? 0}L` : null;
      setProgress("Listing matches…");
      const ids = await client.matchIds(acc.puuid, count);
      const have = new Set(store.games.filter((g) => g.lobby).map((g) => g.matchId)); // refetch old-format games (no lobby)
      const fresh = ids.filter((id) => !have.has(id));
      setProgress(`Fetching ${fresh.length} match${fresh.length === 1 ? "" : "es"}…`);
      const { ok, failed } = await client.matches(fresh, 4, (d, t) => setProgress(`Fetching matches… ${d}/${t}`));
      const fetched = ok.map((m) => toGame(m, acc.puuid, { traitName, componentIds: compIds, unitCost: (id) => unit(id)?.cost })).filter((g): g is RiotGame => !!g);
      const merged = mergeGames(store.games, fetched);
      const next: RiotStore = { ...store, riotId: `${acc.gameName}#${acc.tagLine}`, puuid: acc.puuid, rank, fetchedAt: new Date().toISOString(), games: merged };
      save(next);
      onImport(merged);
      setProgress(`${fetched.length} game${fetched.length === 1 ? "" : "s"} fetched (${merged.length} cached${failed.length ? `, ${failed.length} failed` : ""}).`);
    } catch (ex) {
      setErr(ex instanceof RiotError ? `Riot API: ${ex.message}` : ex instanceof Error ? ex.message : String(ex));
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  const setAsFocus = () => {
    if (!report) return;
    const ok = writeFocus(report.focus);
    const cats = Object.entries(report.focus)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => CATEGORY_LABELS[c as ScenarioCategory]);
    setFocusMsg(ok ? `Daily 10 now leans towards ${cats.join(", ") || "your weakest categories"}.` : "Could not write to browser storage.");
  };

  if (!store) return <p className="text-dim">Loading…</p>;
  const regionSlug = PLATFORMS.find((p) => p.id === store.platform)?.label.toLowerCase() ?? "euw";
  const rid = parseRiotId(store.riotId);
  const profileLinks = rid
    ? [
        { label: "tactics.tools", href: `https://tactics.tools/player/${regionSlug}/${encodeURIComponent(rid.gameName)}/${encodeURIComponent(rid.tagLine)}` },
        { label: "MetaTFT", href: `https://www.metatft.com/player/${regionSlug}/${encodeURIComponent(rid.gameName)}-${encodeURIComponent(rid.tagLine)}` },
        { label: "lolchess", href: `https://lolchess.gg/profile/${regionSlug}/${encodeURIComponent(rid.gameName)}-${encodeURIComponent(rid.tagLine)}` },
      ]
    : [];
  const needsRefetch = store.games.length > 0 && store.games.some((g) => !g.lobby);

  return (
    <div className="space-y-6">
      <Panel as="section" aria-label="Riot sync">
        <SectionTitle kicker="Riot API">Pull your games</SectionTitle>
        <form onSubmit={fetchGames} className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Riot ID</span>
            <input className="input" value={store.riotId} onChange={(e) => setStore({ ...store, riotId: e.target.value })} placeholder="Name#TAG" autoComplete="off" required />
          </label>
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Region</span>
            <select className="input" value={store.platform} onChange={(e) => setStore({ ...store, platform: e.target.value as Platform })}>
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">API key</span>
            <span className="flex gap-1">
              <input className="input" type={showKey ? "text" : "password"} value={store.apiKey} onChange={(e) => setStore({ ...store, apiKey: e.target.value })} placeholder="RGAPI-…" autoComplete="off" spellCheck={false} />
              <button type="button" className="btn btn-sm" onClick={() => setShowKey((s) => !s)} aria-pressed={showKey}>
                {showKey ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          <label className="block">
            <span className="display mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Games</span>
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {COUNTS.map((n) => (
                <option key={n} value={n}>
                  last {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Fetching…" : store.games.length ? "Fetch new games" : "Fetch games"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => writeRiot(store)} disabled={busy}>
              Save settings
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => save({ ...store, games: [], puuid: null, rank: null, fetchedAt: null })} disabled={busy || !store.games.length}>
              Clear cached games
            </button>
            <label className="ml-auto flex items-center gap-2 text-xs text-dim">
              <input type="checkbox" checked={rankedOnly} onChange={(e) => setRankedOnly(e.target.checked)} /> Ranked only
            </label>
          </div>
        </form>
        {progress ? (
          <p className="mt-2 text-xs text-dim" role="status">
            {progress}
          </p>
        ) : null}
        {err ? (
          <p className="mt-2 text-xs text-danger" role="alert">
            {err}
          </p>
        ) : null}
        {needsRefetch ? <p className="mt-2 text-xs text-gold">Some cached games predate the lobby comparison; fetch again to refresh them.</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
          {store.rank ? <span className="text-gold-bright">{store.rank}</span> : null}
          {store.fetchedAt ? <span>Last fetch {store.fetchedAt.slice(0, 16).replace("T", " ")}</span> : null}
          <span>{store.games.length} games cached in this browser</span>
          {profileLinks.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
        <details className="mt-3 text-xs text-dim">
          <summary className="cursor-pointer">Where the key comes from and what is sent</summary>
          <div className="mt-2 max-w-2xl space-y-1">
            <p>
              Log in at{" "}
              <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer">
                developer.riotgames.com
              </a>{" "}
              and copy the development API key (regenerate it every 24 hours) or register a personal key for a permanent one. The key and your games stay in this browser&apos;s storage; the only requests go to api.riotgames.com, straight from your browser. Riot&apos;s dev
              limits (20 requests/s, 100 per 2 min) comfortably cover a 100-game fetch.
            </p>
            <p>Riot stopped shipping augments in match data in early 2024, so augment analysis is not possible here; use the profile links above for that. The match data has final boards only, not round-by-round history, so the game reviews compare end states against the lobby.</p>
          </div>
        </details>
      </Panel>

      {report ? (
        <ReportView
          report={report}
          games={games}
          exercises={exercises}
          unit={unit}
          item={item}
          unitName={unitName}
          traitName={traitName}
          componentIds={compIds}
          open={open}
          setOpen={setOpen}
          onFocus={setAsFocus}
          focusMsg={focusMsg}
        />
      ) : null}
    </div>
  );
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s;
}

function ReportView({
  report: r,
  games,
  exercises,
  unit,
  item,
  unitName,
  traitName,
  componentIds,
  open,
  setOpen,
  onFocus,
  focusMsg,
}: {
  report: Report;
  games: RiotGame[];
  exercises: Exercise[];
  unit: (id: string) => UnitLookup | undefined;
  item: (id: string) => ItemLookup | undefined;
  unitName: (id: string) => string;
  traitName: (id: string) => string;
  componentIds: Set<string>;
  open: string | null;
  setOpen: (id: string | null) => void;
  onFocus: () => void;
  focusMsg: string;
}) {
  const good = r.findings.filter((f) => f.kind === "good");
  const bad = r.findings.filter((f) => f.kind === "bad");
  const improve = r.findings.filter((f) => f.kind === "improve" || f.kind === "bad");
  const trend = r.recentAvg !== null && r.previousAvg !== null ? r.previousAvg - r.recentAvg : null;
  const weakest = [...r.scores].sort((a, b) => a.score - b.score).slice(0, 3);
  const strongest = [...r.scores].sort((a, b) => b.score - a.score).slice(0, 3);
  const sorted = [...games].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Games analysed" value={String(r.games)} sub={`${r.ranked} ranked`} />
        <Tile label="Average placement" value={r.avg === null ? "—" : r.avg.toFixed(2)} sub={trend === null ? undefined : `last 10: ${r.recentAvg!.toFixed(2)} (${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend).toFixed(2)})`} />
        <Tile label="Top 4" value={`${Math.round(r.top4Rate * 100)}%`} sub="break-even is 50%" />
        <Tile label="Wins" value={`${Math.round(r.winRate * 100)}%`} sub={`${Math.round(r.eighthRate * 100)}% 8ths`} />
        <Tile label="Bottom-4 exits" value={r.avgStageOut ?? "—"} sub={r.avgLevelBottom4 !== null ? `level ${r.avgLevelBottom4.toFixed(1)}, ${Math.round(r.avgGoldLeftBottom4 ?? 0)} gold left` : undefined} />
      </section>

      <Panel as="section">
        <SectionTitle kicker="Profile">Where the placements come from</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Radar axes={r.scores} />
          <div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th className="num">Score</th>
                    <th>Behind the number</th>
                  </tr>
                </thead>
                <tbody>
                  {r.scores.map((s) => {
                    const d = DIMENSIONS.find((x) => x.id === s.id)!;
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="text-gold-bright">{s.label}</span>
                          <span className="block text-[0.65rem] text-dim">{d.blurb}</span>
                        </td>
                        <td className="num">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-block h-2 w-16 bg-[var(--bg-deep)]">
                              <span className="block h-full" style={{ width: `${s.score}%`, background: s.score < 45 ? "var(--red)" : s.score < 65 ? "var(--gold)" : "var(--teal)" }} />
                            </span>
                            <span className="w-7 text-right tabular-nums">{s.score}</span>
                          </span>
                        </td>
                        <td className="text-dim">{s.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-dim">
              Strongest: <span className="text-ink">{strongest.map((s) => s.label).join(", ")}</span>. Weakest: <span className="text-ink">{weakest.map((s) => s.label).join(", ")}</span>.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <FindingList title="Going well" kicker="Strengths" color="var(--teal)" list={good} empty="Nothing stands out yet; play more games." />
        <FindingList title="Going wrong" kicker="Leaks" color="var(--red)" list={bad} empty="No clear leak in this sample." />
        <Panel as="section">
          <SectionTitle kicker="Plan">What to work on</SectionTitle>
          {improve.length === 0 ? <p className="text-sm text-dim">Keep doing what you do.</p> : null}
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {improve.slice(0, 6).map((f, i) => (
              <li key={i}>
                <span className="text-gold-bright">{f.title}.</span>{" "}
                {f.category ? (
                  <span className="text-dim">
                    Drill <Link href={`/trainer/${f.category}`}>{categoryLabel(f.category)}</Link>
                    {f.guide ? (
                      <>
                        {" "}
                        · read <Link href={f.guide}>the guide</Link>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={onFocus}>
              Set as training focus
            </button>
            <Link href="/trainer/daily" className="btn btn-sm">
              Open Daily 10
            </Link>
          </div>
          {focusMsg ? (
            <p className="mt-2 text-xs text-dim" role="status">
              {focusMsg}
            </p>
          ) : (
            <p className="mt-2 text-[0.7rem] text-dim">Weights the Daily 10 towards {Object.keys(r.focus).length ? Object.keys(r.focus).map((c) => CATEGORY_LABELS[c as ScenarioCategory]).join(", ") : "nothing yet"}.</p>
          )}
        </Panel>
      </div>

      {exercises.length ? <Exercises exercises={exercises} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel as="section">
          <SectionTitle kicker="Distribution">Placements</SectionTitle>
          <PlacementBars counts={r.distribution} />
        </Panel>
        <Panel as="section">
          <SectionTitle kicker="Comps">By comp</SectionTitle>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Comp (top traits)</th>
                  <th className="num">Games</th>
                  <th className="num">Avg</th>
                  <th className="num">Top 4</th>
                  <th className="num">Wins</th>
                </tr>
              </thead>
              <tbody>
                {r.comps.slice(0, 10).map((c) => (
                  <tr key={c.comp}>
                    <td>{c.comp}</td>
                    <td className="num">{c.games}</td>
                    <td className="num" style={{ color: c.avg <= 4 ? "var(--teal)" : c.avg >= 5 ? "var(--red)" : undefined }}>
                      {c.avg.toFixed(2)}
                    </td>
                    <td className="num">{Math.round(c.top4 * 100)}%</td>
                    <td className="num">{c.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.7rem] text-dim">{r.distinctComps} distinct comps. Named by the two strongest active traits on your final board.</p>
        </Panel>
      </div>

      <Panel as="section">
        <SectionTitle kicker="Units">Most played</SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {r.units.slice(0, 12).map((u) => {
            const lk = unit(u.id);
            return (
              <li key={u.id} className="flex items-center gap-2 text-xs">
                {lk ? <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={30} /> : <span className="inline-block h-[30px] w-[30px] rounded-full bg-[var(--bg-raised)]" />}
                <span className="min-w-0">
                  <span className="block truncate text-gold-bright">{unitName(u.id)}</span>
                  <span className="text-dim">
                    {u.games} games · avg {u.avg.toFixed(2)} · {u.avgItems.toFixed(1)} items{u.threeStar ? ` · ${u.threeStar}× 3★` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <section>
        <SectionTitle kicker="History">Games · click one for the full review</SectionTitle>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Queue</th>
                <th className="num">Place</th>
                <th className="num">Lvl</th>
                <th className="num">Out</th>
                <th className="num">Gold</th>
                <th>Comp</th>
                <th>Board</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => {
                const isOpen = open === g.matchId;
                return <GameRows key={g.matchId} g={g} isOpen={isOpen} toggle={() => setOpen(isOpen ? null : g.matchId)} unit={unit} item={item} unitName={unitName} traitName={traitName} componentIds={componentIds} />;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function GameRows({
  g,
  isOpen,
  toggle,
  unit,
  item,
  unitName,
  traitName,
  componentIds,
}: {
  g: RiotGame;
  isOpen: boolean;
  toggle: () => void;
  unit: (id: string) => UnitLookup | undefined;
  item: (id: string) => ItemLookup | undefined;
  unitName: (id: string) => string;
  traitName: (id: string) => string;
  componentIds: Set<string>;
}) {
  const review = isOpen ? reviewGame(g, { componentIds, unitName, traitName }) : null;
  const lobbyRows = [...(g.lobby ?? []).map((p) => ({ placement: p.placement, level: p.level, comp: p.comp, me: false })), { placement: g.placement, level: g.level, comp: g.comp, me: true }].sort((a, b) => a.placement - b.placement);
  return (
    <>
      <tr className="cursor-pointer align-top" onClick={toggle} aria-expanded={isOpen}>
        <td className="whitespace-nowrap text-dim">{g.at.slice(0, 10)}</td>
        <td className="whitespace-nowrap text-dim">{g.queueName}</td>
        <td className="num" style={{ color: g.placement <= 4 ? "var(--teal)" : g.placement >= 7 ? "var(--red)" : undefined }}>
          {g.placement}
        </td>
        <td className="num">{g.level}</td>
        <td className="num">{g.placement === 1 ? "—" : g.stage}</td>
        <td className="num">{g.goldLeft}</td>
        <td className="whitespace-nowrap">{g.comp}</td>
        <td>
          <span className="flex flex-wrap gap-1">
            {g.units.map((u, i) => {
              const lk = unit(u.id);
              return (
                <span key={i} className="inline-flex flex-col items-center" title={`${unitName(u.id)} ${"★".repeat(u.star)}${u.items.length ? ` · ${u.items.map((it) => item(it)?.name ?? prettyId(it)).join(", ")}` : ""}`}>
                  {lk ? <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={24} /> : <span className="inline-block h-6 w-6 rounded-full bg-[var(--bg-raised)]" />}
                </span>
              );
            })}
          </span>
        </td>
      </tr>
      {isOpen && review ? (
        <tr>
          <td colSpan={8} className="!p-0">
            <div className="panel-raised m-1 border border-[var(--gold-dim)] p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">
                    Review · {g.placement}th at {g.stage}
                  </div>
                  <p className="mt-1 text-sm text-gold-bright">{review.verdict}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wider" style={{ color: "var(--teal)" }}>
                        Done well
                      </div>
                      <ul className="mt-1 space-y-1 text-xs">
                        {review.good.map((s, i) => (
                          <li key={i} className="border-l-2 pl-2" style={{ borderColor: "var(--teal)" }}>
                            {s}
                          </li>
                        ))}
                        {review.good.length === 0 ? <li className="text-dim">Nothing to highlight.</li> : null}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wider" style={{ color: "var(--red)" }}>
                        Leaks
                      </div>
                      <ul className="mt-1 space-y-1 text-xs">
                        {review.bad.map((s, i) => (
                          <li key={i} className="border-l-2 pl-2" style={{ borderColor: "var(--red)" }}>
                            {s}
                          </li>
                        ))}
                        {review.bad.length === 0 ? <li className="text-dim">No leak visible in the final state.</li> : null}
                      </ul>
                    </div>
                  </div>
                  {review.categories.length ? (
                    <p className="mt-3 text-xs text-dim">
                      Drill:{" "}
                      {review.categories.map((c, i) => (
                        <span key={c}>
                          {i ? " · " : ""}
                          <Link href={`/trainer/${c}`}>{CATEGORY_LABELS[c]}</Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[0.7rem] text-dim">{review.notes.join(" · ")}</p>
                </div>
                <div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Final state</th>
                          <th className="num">You</th>
                          <th className="num">Lobby avg</th>
                          <th className="num">1st place</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review.compare.map((c) => (
                          <tr key={c.label}>
                            <td className="text-dim">{c.label}</td>
                            <td className="num text-gold-bright">{c.you}</td>
                            <td className="num">{c.lobby}</td>
                            <td className="num">{c.first}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <div className="text-[0.65rem] uppercase tracking-wider text-dim">Your final board</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {g.units.map((u, i) => {
                        const lk = unit(u.id);
                        return (
                          <span key={i} className="inline-flex flex-col items-center" title={unitName(u.id)}>
                            {lk ? <UnitIcon icon={lk.icon} name={lk.name} cost={lk.cost} size={36} /> : <span className="inline-block h-9 w-9 rounded-full bg-[var(--bg-raised)]" />}
                            <span className="text-[0.6rem] text-dim">{"★".repeat(u.star)}</span>
                            <span className="flex gap-px">
                              {u.items.map((it, j) => {
                                const il = item(it);
                                return il ? <ItemIcon key={j} icon={il.icon} name={il.name} size={12} /> : <span key={j} className="inline-block h-3 w-3 border border-[var(--gold-dim)]" title={prettyId(it)} />;
                              })}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="mt-1 text-[0.7rem] text-dim">
                      {g.traits
                        .filter((t) => t.style > 0)
                        .sort((a, b) => b.style - a.style || b.count - a.count)
                        .map((t) => `${traitName(t.id)} ${t.count}`)
                        .join(" · ")}
                    </div>
                  </div>
                  {g.lobby?.length ? (
                    <div className="mt-3">
                      <div className="text-[0.65rem] uppercase tracking-wider text-dim">Lobby</div>
                      <ul className="mt-1 grid gap-x-4 gap-y-0.5 text-[0.7rem] sm:grid-cols-2">
                        {lobbyRows.map((p, i) => (
                          <li key={i} className={p.me ? "text-gold-bright" : "text-dim"}>
                            <span className="inline-block w-4 tabular-nums">{p.placement}</span> {p.comp} · lvl {p.level}
                            {p.me ? " · you" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

interface ExState {
  version: 1;
  answers: Record<string, string>;
}

function Exercises({ exercises }: { exercises: Exercise[] }) {
  const [st, setSt] = useState<ExState>({ version: 1, answers: {} });
  useEffect(() => {
    const d = readJson<ExState | null>(EX_KEY, null);
    if (d && d.version === 1 && d.answers) setSt(d);
  }, []);
  const answer = (id: string, opt: string) => {
    const next = { ...st, answers: { ...st.answers, [id]: opt } };
    setSt(next);
    writeJson(EX_KEY, next);
  };
  const reset = () => {
    const next: ExState = { version: 1, answers: {} };
    setSt(next);
    writeJson(EX_KEY, next);
  };
  const done = exercises.filter((e) => st.answers[e.id]).length;
  const right = exercises.filter((e) => st.answers[e.id] === e.correct).length;
  return (
    <section aria-label="Personal exercises" className="panel p-4 sm:p-5">
      <SectionTitle kicker="Your exercises">Built from your own games</SectionTitle>
      <p className="mb-3 text-xs text-dim">Each question comes from a real game in your history. Answer, read why, then drill the category in the Trainer. {done ? `${right} of ${done} answered correctly.` : ""}</p>
      <ol className="space-y-4">
        {exercises.map((e, idx) => {
          const chosen = st.answers[e.id];
          const graded = !!chosen;
          return (
            <li key={e.id} className="border-t border-[var(--gold-dim)] pt-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="display uppercase tracking-wider text-gold">
                  {idx + 1} · {CATEGORY_LABELS[e.category]}
                </span>
                <span className="text-gold-bright">{e.title}</span>
              </div>
              <p className="mt-1 text-sm">{e.prompt}</p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2" role="group" aria-label={e.title}>
                {e.options.map((o) => {
                  const isChosen = chosen === o.id;
                  const isCorrect = o.id === e.correct;
                  const cls = graded ? (isCorrect ? "border-[var(--teal)]" : isChosen ? "border-[var(--red)]" : "border-[var(--gold-dim)] opacity-60") : "border-[var(--gold-dim)] hover:border-gold";
                  return (
                    <button key={o.id} type="button" className={`notch border bg-[var(--bg-raised)] p-2 text-left text-xs ${cls}`} disabled={graded} aria-pressed={isChosen} onClick={() => answer(e.id, o.id)}>
                      {graded && isCorrect ? <span className="mr-1 text-[var(--teal)]">✓</span> : null}
                      {graded && isChosen && !isCorrect ? <span className="mr-1 text-[var(--red)]">✕</span> : null}
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {graded ? (
                <div className="mt-2 text-xs">
                  <p className={chosen === e.correct ? "text-[var(--teal)]" : "text-[var(--red)]"}>{chosen === e.correct ? "Correct." : "Not this time."}</p>
                  <p className="mt-1 text-dim">{e.explanation}</p>
                  <p className="mt-1 text-dim">
                    <Link href={e.guide}>Read the guide</Link> · <Link href={`/trainer/${e.category}`}>Drill {CATEGORY_LABELS[e.category]}</Link>
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {done ? (
        <button type="button" className="btn btn-sm mt-4" onClick={reset}>
          Reset answers
        </button>
      ) : null}
    </section>
  );
}

function FindingList({ title, kicker, color, list, empty }: { title: string; kicker: string; color: string; list: Finding[]; empty: string }) {
  return (
    <Panel as="section">
      <SectionTitle kicker={kicker}>{title}</SectionTitle>
      {list.length === 0 ? <p className="text-sm text-dim">{empty}</p> : null}
      <ul className="space-y-3">
        {list.map((f, i) => (
          <li key={i} className="border-l-2 pl-3" style={{ borderColor: color }}>
            <div className="text-sm text-gold-bright">{f.title}</div>
            <p className="mt-0.5 text-xs text-dim">{f.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
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
