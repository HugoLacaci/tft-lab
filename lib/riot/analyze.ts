/**
 * Turns raw Riot matches into compact per-game records (you + the lobby) and
 * builds the reports: overall scores per dimension, findings, per-game
 * analysis. Pure functions; tested in tests/riot.test.ts.
 */
import { CATEGORY_GUIDE, CATEGORY_LABELS, type ScenarioCategory } from "../scenario-categories";
import { QUEUES, type MatchDto, type ParticipantDto } from "./types";

export interface GameUnit {
  id: string;
  star: number;
  items: string[];
  cost?: number;
}
export interface GameTrait {
  id: string;
  count: number;
  style: number; // Riot's 0..4
}
/** One opponent's final state (kept small; 7 per game). */
export interface LobbyPlayer {
  placement: number;
  level: number;
  lastRound: number;
  goldLeft: number;
  eliminated: number;
  damage: number;
  units: number;
  completedItems: number;
  twoStars: number;
  threeStars: number;
  comp: string;
  topTraits: string[]; // trait ids with style > 0
}

/** One game, one player. Stored in localStorage; keep it small. */
export interface RiotGame {
  matchId: string;
  at: string; // ISO
  queue: number;
  queueName: string;
  set: number;
  lengthSec: number;
  placement: number;
  level: number;
  lastRound: number;
  stage: string; // "4-2"
  goldLeft: number;
  playersEliminated: number;
  damageToPlayers: number;
  timeEliminated: number;
  traits: GameTrait[];
  units: GameUnit[];
  augments: string[];
  /** Short comp label from the two strongest traits, e.g. "Inferno 6 · Ravager 4". */
  comp: string;
  lobby?: LobbyPlayer[];
}

export interface ToGameOptions {
  traitName?: (id: string) => string;
  componentIds?: Set<string>;
  unitCost?: (id: string) => number | undefined;
}

export function roundToStage(round: number): string {
  if (round <= 0) return "?";
  if (round <= 4) return `1-${round}`;
  const n = round - 5;
  return `${2 + Math.floor(n / 7)}-${(n % 7) + 1}`;
}

/** Expected level for a round under the standard timings (6 at 3-2, 7 at 4-1, 8 at 4-5, 9 at 5-5). */
export function expectedLevel(round: number): number {
  if (round < 5) return 3;
  if (round < 9) return 4; // 2-1..2-4
  if (round < 12) return 5; // 2-5..2-7
  if (round < 17) return 6; // 3-2..3-6
  if (round < 20) return 7; // 3-7..4-1 (7 by 4-1)
  if (round < 24) return 8; // 4-2..4-5 → 8 at 4-5
  if (round < 31) return 8; // stage 5 before 5-5
  if (round < 34) return 9;
  return 9;
}

function traitWeight(t: GameTrait): number {
  return t.style * 100 + t.count;
}

export function prettyId(id: string): string {
  let s = id.replace(/^(TFT\d*_(Item_|Augment_)?|DA_\d*_?|Set\d+_)/i, "");
  s = s.replace(/_(AD|AP|Base|Upgrade)$/i, "");
  s = s.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return s;
}

export function compLabel(traits: GameTrait[], name: (id: string) => string): string {
  const top = [...traits].filter((t) => t.style > 0).sort((a, b) => traitWeight(b) - traitWeight(a)).slice(0, 2);
  if (!top.length) return "No active traits";
  return top.map((t) => `${name(t.id)} ${t.count}`).join(" · ");
}

/** Completed items = anything that is not a component/consumable/spatula. */
export function isCompletedItem(id: string, componentIds: Set<string>): boolean {
  if (!id) return false;
  if (componentIds.has(id)) return false;
  if (/Component|Spatula|FryingPan|Consumable|Assist|Gold|Remover|Reforger|Duplicator/i.test(id)) return false;
  return true;
}

function completedCount(p: ParticipantDto, comps: Set<string>): number {
  return (p.units ?? []).reduce((a, u) => a + (u.itemNames ?? []).filter((i) => isCompletedItem(i, comps)).length, 0);
}

export function toGame(m: MatchDto, puuid: string, optsOrName: ToGameOptions | ((id: string) => string) = {}): RiotGame | null {
  const opts: ToGameOptions = typeof optsOrName === "function" ? { traitName: optsOrName } : optsOrName;
  const traitName = opts.traitName ?? prettyId;
  const comps = opts.componentIds ?? new Set<string>();
  const p: ParticipantDto | undefined = m.info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;
  const queue = m.info.queue_id ?? m.info.queueId ?? 0;
  const mkTraits = (x: ParticipantDto): GameTrait[] => (x.traits ?? []).map((t) => ({ id: t.name, count: t.num_units, style: t.style })).filter((t) => t.count > 0);
  const traits = mkTraits(p);
  const lobby: LobbyPlayer[] = m.info.participants
    .filter((x) => x.puuid !== puuid)
    .map((x) => {
      const tr = mkTraits(x);
      return {
        placement: x.placement,
        level: x.level,
        lastRound: x.last_round,
        goldLeft: x.gold_left,
        eliminated: x.players_eliminated,
        damage: x.total_damage_to_players,
        units: (x.units ?? []).length,
        completedItems: completedCount(x, comps),
        twoStars: (x.units ?? []).filter((u) => u.tier === 2).length,
        threeStars: (x.units ?? []).filter((u) => u.tier >= 3).length,
        comp: compLabel(tr, traitName),
        topTraits: tr.filter((t) => t.style > 0).sort((a, b) => traitWeight(b) - traitWeight(a)).slice(0, 2).map((t) => t.id),
      };
    })
    .sort((a, b) => a.placement - b.placement);
  return {
    matchId: m.metadata.match_id,
    at: new Date(m.info.game_datetime).toISOString(),
    queue,
    queueName: QUEUES[queue] ?? (m.info.tft_game_type ?? `queue ${queue}`),
    set: m.info.tft_set_number ?? 0,
    lengthSec: Math.round(m.info.game_length ?? 0),
    placement: p.placement,
    level: p.level,
    lastRound: p.last_round,
    stage: roundToStage(p.last_round),
    goldLeft: p.gold_left,
    playersEliminated: p.players_eliminated,
    damageToPlayers: p.total_damage_to_players,
    timeEliminated: Math.round(p.time_eliminated ?? 0),
    traits,
    units: (p.units ?? []).map((u) => ({ id: u.character_id, star: u.tier, items: u.itemNames ?? [], cost: opts.unitCost?.(u.character_id) })),
    augments: p.augments ?? [],
    comp: compLabel(traits, traitName),
    lobby,
  };
}

// ---------------------------------------------------------------- report --

export interface Finding {
  kind: "good" | "bad" | "improve";
  title: string;
  detail: string;
  category?: ScenarioCategory;
  guide?: string;
}

export interface CompRow {
  comp: string;
  games: number;
  avg: number;
  top4: number;
  wins: number;
}
export interface UnitRow {
  id: string;
  games: number;
  avg: number;
  avgItems: number;
  threeStar: number;
}

export type Dimension = "placement" | "consistency" | "tempo" | "econ" | "items" | "cap" | "damage" | "flexibility";
export const DIMENSIONS: { id: Dimension; label: string; category: ScenarioCategory; blurb: string }[] = [
  { id: "placement", label: "Placement", category: "endgame", blurb: "Average placement, 1st = 100." },
  { id: "consistency", label: "Consistency", category: "hp-management", blurb: "Top-4 rate minus a penalty per 8th." },
  { id: "tempo", label: "Tempo", category: "level-timing", blurb: "Your level at the end vs the lobby's and vs the standard timing for that stage." },
  { id: "econ", label: "Economy", category: "econ", blurb: "Gold left when eliminated (spending it in time = 100)." },
  { id: "items", label: "Items", category: "items", blurb: "Completed items on your final board vs the lobby." },
  { id: "cap", label: "Board cap", category: "endgame", blurb: "Share of 2★+ units and 3★s on the final board vs the lobby." },
  { id: "damage", label: "Aggression", category: "scouting", blurb: "Damage to players and eliminations vs the lobby." },
  { id: "flexibility", label: "Flexibility", category: "pivot", blurb: "How many different comps you reach; best around 40–70% of games." },
];

export interface Score {
  id: Dimension;
  label: string;
  score: number; // 0..100
  note: string;
}

export interface Report {
  games: number;
  ranked: number;
  avg: number | null;
  top4Rate: number;
  winRate: number;
  eighthRate: number;
  recentAvg: number | null;
  previousAvg: number | null;
  distribution: number[];
  avgLevelBottom4: number | null;
  avgGoldLeftBottom4: number | null;
  avgLevelTop4: number | null;
  avgStageOut: string | null;
  avgCompletedItemsBottom4: number | null;
  avgCompletedItemsTop4: number | null;
  distinctComps: number;
  comps: CompRow[];
  units: UnitRow[];
  scores: Score[];
  findings: Finding[];
  /** trainer category weights derived from the weakest dimensions, 0..1 */
  focus: Partial<Record<ScenarioCategory, number>>;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (n: number, d: number) => (d ? n / d : 0);
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function completedItemsOf(g: RiotGame, componentIds: Set<string>): number {
  return g.units.reduce((a, u) => a + u.items.filter((i) => isCompletedItem(i, componentIds)).length, 0);
}

export function analyze(all: RiotGame[], opts: { rankedOnly?: boolean; componentIds?: Set<string>; unitName?: (id: string) => string } = {}): Report {
  const componentIds = opts.componentIds ?? new Set<string>();
  const games = [...all].filter((g) => !opts.rankedOnly || g.queue === 1100).sort((a, b) => a.at.localeCompare(b.at));
  const n = games.length;
  const places = games.map((g) => g.placement);
  const dist = Array(8).fill(0) as number[];
  for (const p of places) if (p >= 1 && p <= 8) dist[p - 1]!++;
  const top4 = places.filter((p) => p <= 4).length;
  const wins = places.filter((p) => p === 1).length;
  const eighths = places.filter((p) => p === 8).length;
  const bottom = games.filter((g) => g.placement >= 5);
  const top = games.filter((g) => g.placement <= 4);
  const recent = games.slice(-10);
  const previous = games.slice(-20, -10);
  const completed = (g: RiotGame) => completedItemsOf(g, componentIds);

  const compMap = new Map<string, number[]>();
  for (const g of games) {
    const arr = compMap.get(g.comp) ?? [];
    arr.push(g.placement);
    compMap.set(g.comp, arr);
  }
  const comps: CompRow[] = [...compMap]
    .map(([comp, ps]) => ({ comp, games: ps.length, avg: mean(ps)!, top4: pct(ps.filter((p) => p <= 4).length, ps.length), wins: ps.filter((p) => p === 1).length }))
    .sort((a, b) => b.games - a.games || a.avg - b.avg);

  const unitMap = new Map<string, { ps: number[]; items: number[]; three: number }>();
  for (const g of games)
    for (const u of g.units) {
      const e = unitMap.get(u.id) ?? { ps: [], items: [], three: 0 };
      e.ps.push(g.placement);
      e.items.push(u.items.filter((i) => isCompletedItem(i, componentIds)).length);
      if (u.star >= 3) e.three++;
      unitMap.set(u.id, e);
    }
  const units: UnitRow[] = [...unitMap]
    .map(([id, e]) => ({ id, games: e.ps.length, avg: mean(e.ps)!, avgItems: mean(e.items)!, threeStar: e.three }))
    .sort((a, b) => b.games - a.games || a.avg - b.avg);

  const avgStageOutBottom = bottom.length ? roundToStage(Math.round(mean(bottom.map((g) => g.lastRound))!)) : null;

  const report: Report = {
    games: n,
    ranked: games.filter((g) => g.queue === 1100).length,
    avg: mean(places),
    top4Rate: pct(top4, n),
    winRate: pct(wins, n),
    eighthRate: pct(eighths, n),
    recentAvg: recent.length >= 5 ? mean(recent.map((g) => g.placement)) : null,
    previousAvg: previous.length >= 5 ? mean(previous.map((g) => g.placement)) : null,
    distribution: dist,
    avgLevelBottom4: mean(bottom.map((g) => g.level)),
    avgGoldLeftBottom4: mean(bottom.map((g) => g.goldLeft)),
    avgLevelTop4: mean(top.map((g) => g.level)),
    avgStageOut: avgStageOutBottom,
    avgCompletedItemsBottom4: mean(bottom.map(completed)),
    avgCompletedItemsTop4: mean(top.map(completed)),
    distinctComps: compMap.size,
    comps,
    units,
    scores: [],
    findings: [],
    focus: {},
  };
  report.scores = scores(report, games, componentIds);
  report.findings = findings(report, games, { componentIds, unitName: opts.unitName ?? prettyId });
  report.focus = focusFromScores(report.scores);
  return report;
}

// ---------------------------------------------------------------- scores --

export function scores(r: Report, games: RiotGame[], componentIds: Set<string>): Score[] {
  const n = games.length;
  if (!n) return DIMENSIONS.map((d) => ({ id: d.id, label: d.label, score: 0, note: "no games" }));
  const bottom = games.filter((g) => g.placement >= 5);
  const withLobby = games.filter((g) => g.lobby && g.lobby.length);

  const placement = clamp(((8 - (r.avg ?? 8)) / 7) * 100);
  const consistency = clamp(r.top4Rate * 100 - r.eighthRate * 100 * 1.5 + 10);

  // tempo: your level vs expected for the round you left + vs the lobby's average level
  const tempoParts = games.map((g) => {
    const exp = expectedLevel(g.lastRound);
    const vsExp = g.level - exp; // -2..+1
    const lobbyAvg = g.lobby?.length ? mean(g.lobby.map((p) => p.level))! : null;
    const vsLobby = lobbyAvg === null ? 0 : g.level - lobbyAvg;
    return 60 + vsExp * 20 + vsLobby * 10;
  });
  const tempo = clamp(mean(tempoParts) ?? 50);

  // econ: gold left at elimination in bottom-4 games (winners keep gold legitimately)
  const goldParts = (bottom.length ? bottom : games).map((g) => clamp(100 - Math.max(0, g.goldLeft - 5) * 3));
  const econ = clamp(mean(goldParts) ?? 60);

  // items: completed items vs lobby average
  const itemParts = withLobby.map((g) => {
    const mine = completedItemsOf(g, componentIds);
    const lobby = mean(g.lobby!.map((p) => p.completedItems)) ?? mine;
    return 60 + (mine - lobby) * 12;
  });
  const items = withLobby.length ? clamp(mean(itemParts)!) : clamp(40 + (r.avgCompletedItemsTop4 ?? 4) * 8);

  // cap: share of 2★+ on the final board + 3★ count vs lobby
  const capParts = games.map((g) => {
    const total = Math.max(1, g.units.length);
    const twoPlus = g.units.filter((u) => u.star >= 2).length / total;
    const three = g.units.filter((u) => u.star >= 3).length;
    const lobbyThree = g.lobby?.length ? mean(g.lobby.map((p) => p.threeStars))! : 0.5;
    return twoPlus * 80 + (three - lobbyThree) * 10 + 10;
  });
  const cap = clamp(mean(capParts) ?? 50);

  // damage: total damage to players vs lobby mean
  const dmgParts = withLobby.map((g) => {
    const lobby = mean(g.lobby!.map((p) => p.damage)) ?? g.damageToPlayers;
    return lobby > 0 ? 50 + ((g.damageToPlayers - lobby) / lobby) * 60 : 50;
  });
  const damage = withLobby.length ? clamp(mean(dmgParts)!) : 50;

  // flexibility: distinct comps / games, best 0.4..0.7
  const flex = r.distinctComps / n;
  const flexibility = clamp(flex < 0.4 ? 40 + (flex / 0.4) * 55 : flex <= 0.7 ? 95 : 95 - (flex - 0.7) * 150);

  const note = {
    placement: `avg ${r.avg?.toFixed(2) ?? "—"}`,
    consistency: `${Math.round(r.top4Rate * 100)}% top 4 · ${Math.round(r.eighthRate * 100)}% 8ths`,
    tempo: r.avgLevelBottom4 !== null ? `level ${r.avgLevelBottom4.toFixed(1)} when out (bottom 4)` : "—",
    econ: r.avgGoldLeftBottom4 !== null ? `${Math.round(r.avgGoldLeftBottom4)} gold left when out` : "—",
    items: r.avgCompletedItemsTop4 !== null ? `${r.avgCompletedItemsTop4.toFixed(1)} items in top 4 / ${(r.avgCompletedItemsBottom4 ?? 0).toFixed(1)} in bottom 4` : "—",
    cap: `${Math.round((mean(games.map((g) => g.units.filter((u) => u.star >= 2).length / Math.max(1, g.units.length))) ?? 0) * 100)}% of final boards 2★+`,
    damage: `${Math.round(mean(games.map((g) => g.damageToPlayers)) ?? 0)} dmg to players per game`,
    flexibility: `${r.distinctComps} comps in ${n} games`,
  } satisfies Record<Dimension, string>;

  const val: Record<Dimension, number> = { placement, consistency, tempo, econ, items, cap, damage, flexibility };
  return DIMENSIONS.map((d) => ({ id: d.id, label: d.label, score: Math.round(val[d.id]), note: note[d.id] }));
}

export function focusFromScores(s: Score[]): Partial<Record<ScenarioCategory, number>> {
  const out: Partial<Record<ScenarioCategory, number>> = {};
  for (const sc of s) {
    const d = DIMENSIONS.find((x) => x.id === sc.id)!;
    const w = clamp((70 - sc.score) / 50, 0, 1); // 70+ → 0, 20 → 1
    if (w > 0) out[d.category] = Math.max(out[d.category] ?? 0, Math.round(w * 100) / 100);
  }
  return out;
}

// -------------------------------------------------------------- findings --

function f(kind: Finding["kind"], title: string, detail: string, category?: ScenarioCategory): Finding {
  return { kind, title, detail, category, guide: category ? CATEGORY_GUIDE[category] : undefined };
}

export function findings(r: Report, games: RiotGame[], ctx: { componentIds: Set<string>; unitName: (id: string) => string }): Finding[] {
  const out: Finding[] = [];
  const n = r.games;
  if (n < 5) {
    out.push(f("improve", "Not enough games yet", `Only ${n} game${n === 1 ? "" : "s"} analysed. Fetch more (40–60) for patterns to mean anything.`));
    return out;
  }
  const p = (x: number) => `${Math.round(x * 100)}%`;
  const sc = (id: Dimension) => r.scores.find((s) => s.id === id)?.score ?? 50;

  // --- consistency
  if (r.top4Rate >= 0.6) out.push(f("good", "Consistent top 4", `${p(r.top4Rate)} top-4 rate over ${n} games. Your baseline game is solid.`));
  else if (r.top4Rate < 0.45) out.push(f("bad", "Top-4 rate below break-even", `${p(r.top4Rate)} top 4. Below 50% you lose LP on average; cut 7ths and 8ths before chasing 1sts.`, "hp-management"));

  if (r.eighthRate >= 0.15) out.push(f("bad", "Too many 8ths", `${p(r.eighthRate)} of games end 8th (${Math.round(r.eighthRate * n)} of ${n}). An 8th costs about two 4ths; stabilising earlier is the highest-value fix.`, "hp-management"));
  else if (r.eighthRate <= 0.05 && n >= 15) out.push(f("good", "You rarely go 8th", `${p(r.eighthRate)} 8ths: you recognise a lost spot early and play for placement.`));

  if (r.top4Rate >= 0.5 && r.winRate < 0.08 && n >= 15) out.push(f("improve", "Top 4s that do not convert to 1sts", `${p(r.top4Rate)} top 4 but only ${p(r.winRate)} wins. Once you are safe, cap the board: level 9, 2★ every 4-cost, hunt the last item slots instead of holding gold.`, "endgame"));
  if (r.winRate >= 0.15) out.push(f("good", "Strong win rate", `${p(r.winRate)} 1sts. When you have the board you close the lobby out.`));

  // --- trend
  if (r.recentAvg !== null && r.previousAvg !== null) {
    const d = r.previousAvg - r.recentAvg;
    if (d >= 0.5) out.push(f("good", "Trending up", `Last 10 games average ${r.recentAvg.toFixed(2)} vs ${r.previousAvg.toFixed(2)} before. Keep whatever changed.`));
    else if (d <= -0.5) out.push(f("bad", "Trending down", `Last 10 games average ${r.recentAvg.toFixed(2)} vs ${r.previousAvg.toFixed(2)} before. Check tilt and queue times before blaming the comp.`));
  }

  // --- econ
  const bottom = games.filter((g) => g.placement >= 5);
  const richDeaths = bottom.filter((g) => g.goldLeft >= 20).length;
  if (bottom.length >= 4 && richDeaths / bottom.length >= 0.35)
    out.push(f("bad", "Dying with gold in the bank", `${richDeaths} of ${bottom.length} bottom-4 games ended with 20+ gold unspent (avg ${Math.round(r.avgGoldLeftBottom4 ?? 0)}). Gold you die with was worth a level or a roll-down two rounds earlier.`, "econ"));
  else if (bottom.length >= 4 && (r.avgGoldLeftBottom4 ?? 0) < 8) out.push(f("good", "You spend before you die", `Average ${Math.round(r.avgGoldLeftBottom4 ?? 0)} gold left in bottom-4 games: you commit your resources when it matters.`));

  // --- tempo
  if (bottom.length >= 4 && (r.avgLevelBottom4 ?? 9) < 7.5)
    out.push(f("bad", "Eliminated under-levelled", `Bottom-4 games end at level ${(r.avgLevelBottom4 ?? 0).toFixed(1)} on average (around stage ${r.avgStageOut}). Hit the standard timings (6 at 3-2, 7 at 4-1, 8 at 4-2/4-5) or the lobby's boards outscale yours.`, "level-timing"));
  const behindLobby = games.filter((g) => g.lobby?.length && g.level < (mean(g.lobby.map((x) => x.level)) ?? 0) - 0.75);
  if (behindLobby.length / n >= 0.4) out.push(f("bad", "Below the lobby's level", `In ${behindLobby.length} of ${n} games you finished at least one level under the lobby average. Level timing is the cheapest tempo you can buy.`, "level-timing"));
  else if (sc("tempo") >= 70) out.push(f("good", "Tempo is on point", `You keep pace with the lobby's levels and the standard timings.`));
  const earlyOuts = games.filter((g) => g.lastRound > 0 && g.lastRound <= 18).length;
  if (earlyOuts / n >= 0.2) out.push(f("bad", "Early deaths", `${earlyOuts} of ${n} games ended before 4-1. Early HP bleeds from weak stage-2/3 boards: slam items, play the strongest board, take streak decisions consciously.`, "hp-management"));

  // --- items
  if (r.avgCompletedItemsBottom4 !== null && r.avgCompletedItemsTop4 !== null && bottom.length >= 4 && r.avgCompletedItemsBottom4 + 1.5 <= r.avgCompletedItemsTop4)
    out.push(f("bad", "Item gap between good and bad games", `${r.avgCompletedItemsTop4.toFixed(1)} completed items on the board in top-4 games vs ${r.avgCompletedItemsBottom4.toFixed(1)} in bottom 4. Holding components is a leak: slam earlier, pick carousel for the slam, not the fourth component.`, "items"));
  if (sc("items") < 45) out.push(f("bad", "Fewer items than the lobby", `Your final boards carry fewer completed items than your opponents'. Take components from carousel with a slam in mind and build on the unit you have, not the one you want.`, "items"));
  const carryItems = r.units.filter((u) => u.games >= 3).sort((a, b) => b.avgItems - a.avgItems)[0];
  if (carryItems && carryItems.avgItems >= 2.5) out.push(f("good", "Your carries hold their items", `${ctx.unitName(carryItems.id)} averages ${carryItems.avgItems.toFixed(1)} completed items across ${carryItems.games} games.`));

  // --- cap
  if (sc("cap") < 50) out.push(f("bad", "Uncapped final boards", `Too many 1★ units on your final boards. Before adding a 1★ 5-cost, 2★ the 4-costs you already play; a 1★ unit is often weaker than the 2★ it replaced.`, "endgame"));
  else if (sc("cap") >= 75) out.push(f("good", "Boards are capped", `Your final boards are mostly 2★ with the occasional 3★: you finish the comp instead of stopping half-way.`));

  // --- comps
  const forced = r.comps.filter((c) => c.games >= 3 && c.avg >= 5).sort((a, b) => b.avg - a.avg)[0];
  if (forced) out.push(f("bad", `Forcing “${forced.comp}” is not paying`, `${forced.games} games, average ${forced.avg.toFixed(2)}, ${p(forced.top4)} top 4. Either it is contested in your lobbies or your version is under-itemised; scout at 2-1 and be ready to pivot.`, "pivot"));
  const contested = games.filter((g) => g.lobby?.length && g.lobby.some((x) => x.topTraits[0] && g.traits.some((t) => t.style > 0 && t.id === x.topTraits[0])));
  const contestedBad = contested.filter((g) => g.placement >= 5).length;
  if (contested.length >= 5 && contestedBad / contested.length >= 0.6) out.push(f("bad", "Contested comps cost you", `${contestedBad} of ${contested.length} games where another player shared your main trait ended bottom 4. Scout at 2-1 and 3-2: two people on the same line both lose.`, "scouting"));
  const best = r.comps.filter((c) => c.games >= 3 && c.avg <= 3.5).sort((a, b) => a.avg - b.avg)[0];
  if (best) out.push(f("good", `“${best.comp}” is your best line`, `${best.games} games, average ${best.avg.toFixed(2)}, ${p(best.top4)} top 4. Know its spot: which augments and which opening components send you there.`));
  const flex = r.distinctComps / n;
  if (n >= 15 && flex <= 0.3) out.push(f("improve", "Narrow comp pool", `${r.distinctComps} distinct comps in ${n} games. Fine while it works; when a patch or a contested lobby hits you need a second and third line. Learn one more comp from a different item family.`, "pivot"));
  if (n >= 15 && flex >= 0.85 && r.avg !== null && r.avg > 4.5) out.push(f("improve", "Playing something different every game", `${r.distinctComps} comps in ${n} games with a ${r.avg.toFixed(2)} average. Flexibility only pays when the boards stay strong; pick two or three lines and learn their breakpoints.`, "pivot"));

  // --- damage
  const topGames = games.filter((g) => g.placement <= 2);
  if (topGames.length >= 3) {
    const avgElim = mean(topGames.map((g) => g.playersEliminated)) ?? 0;
    if (avgElim >= 2) out.push(f("good", "Closing out lobbies", `In your 1sts and 2nds you eliminate ${avgElim.toFixed(1)} players on average: the capped board is doing its job.`));
  }
  if (sc("damage") < 40) out.push(f("improve", "Low damage to players", `Your boards deal less player damage than the lobby's, even in good games. Win-streaking early (a strong stage-2 board) is worth both HP and gold.`, "hp-management"));

  if (!out.some((x) => x.kind === "improve" || x.kind === "bad")) {
    out.push(f("improve", "Next step: raise the ceiling", `The numbers are healthy. Work on 1st-place conversion: study your 2nds and 3rds for the missing 3-star or item and drill Endgame scenarios.`, "endgame"));
  }
  return out;
}

export function categoryLabel(c?: ScenarioCategory): string {
  return c ? CATEGORY_LABELS[c] : "";
}

// ------------------------------------------------------------ per game --

export interface GameReview {
  verdict: string;
  good: string[];
  bad: string[];
  notes: string[];
  compare: { label: string; you: string; lobby: string; first: string }[];
  categories: ScenarioCategory[];
}

export function reviewGame(g: RiotGame, ctx: { componentIds: Set<string>; unitName: (id: string) => string; traitName: (id: string) => string }): GameReview {
  const good: string[] = [];
  const bad: string[] = [];
  const notes: string[] = [];
  const cats = new Set<ScenarioCategory>();
  const lobby = g.lobby ?? [];
  const first = lobby.find((x) => x.placement === 1) ?? null;
  const lobbyAvg = (k: (x: LobbyPlayer) => number) => (lobby.length ? mean(lobby.map(k))! : NaN);
  const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
  const mine = completedItemsOf(g, ctx.componentIds);
  const oneStars = g.units.filter((u) => u.star === 1);
  const threeStars = g.units.filter((u) => u.star >= 3);
  const expLvl = expectedLevel(g.lastRound);
  const won = g.placement === 1;

  // placement
  if (g.placement === 1) good.push("Won the lobby.");
  else if (g.placement <= 4) good.push(`Top 4 (${g.placement}th).`);
  else if (g.placement === 8) bad.push("8th: the most expensive placement. Everything below is about what could have bought one more round.");

  // tempo
  if (!won) {
    if (g.level >= expLvl + 1) good.push(`Level ${g.level} at ${g.stage} is ahead of the standard timing (${expLvl}).`);
    else if (g.level < expLvl) {
      bad.push(`Level ${g.level} at ${g.stage}; the standard timing says ${expLvl}. You were out-tempoed before the board could catch up.`);
      cats.add("level-timing");
    }
    const la = lobbyAvg((x) => x.level);
    if (Number.isFinite(la) && g.level < la - 0.75) {
      bad.push(`The lobby finished at level ${fmt(la)} on average; you were at ${g.level}.`);
      cats.add("level-timing");
    }
  }

  // econ
  if (!won && g.goldLeft >= 20) {
    bad.push(`Eliminated with ${g.goldLeft} gold. That was a level or a roll-down two rounds earlier.`);
    cats.add("econ");
  } else if (!won && g.goldLeft <= 5 && g.placement >= 5) good.push("Spent everything before going out: no gold wasted.");

  // items
  const li = lobbyAvg((x) => x.completedItems);
  if (Number.isFinite(li)) {
    if (mine >= li + 1) good.push(`${mine} completed items vs ${fmt(li)} lobby average: well itemised.`);
    else if (mine <= li - 1.5) {
      bad.push(`${mine} completed items vs ${fmt(li)} lobby average. Components held too long or a carousel spent on the wrong piece.`);
      cats.add("items");
    }
  }
  const carriers = g.units.filter((u) => u.items.filter((i) => isCompletedItem(i, ctx.componentIds)).length >= 3);
  if (carriers.length) good.push(`Full carry${carriers.length > 1 ? "s" : ""}: ${carriers.map((u) => ctx.unitName(u.id)).join(", ")} with 3 items.`);
  else if (mine >= 3 && g.units.length) {
    bad.push("No unit held 3 items: damage was spread instead of stacked on one carry.");
    cats.add("items");
  }

  // cap
  if (g.units.length && oneStars.length / g.units.length >= 0.4 && g.lastRound >= 19) {
    bad.push(`${oneStars.length} of ${g.units.length} units were 1★ at the end (${oneStars.map((u) => ctx.unitName(u.id)).join(", ")}). Uncapped board for stage ${g.stage.split("-")[0]}.`);
    cats.add("endgame");
  }
  if (threeStars.length) good.push(`3★ ${threeStars.map((u) => ctx.unitName(u.id)).join(", ")}.`);
  if (g.units.length < g.level && g.lastRound >= 12) {
    bad.push(`${g.units.length} units on the board at level ${g.level}: an empty slot is a free unit you did not use.`);
    cats.add("endgame");
  }

  // contest
  const myTop = g.traits.filter((t) => t.style > 0).sort((a, b) => traitWeight(b) - traitWeight(a))[0];
  if (myTop) {
    const sharers = lobby.filter((x) => x.topTraits.includes(myTop.id));
    if (sharers.length >= 2) {
      bad.push(`${ctx.traitName(myTop.id)} was contested by ${sharers.length} other players (they placed ${sharers.map((x) => x.placement).join(", ")}).`);
      cats.add("scouting");
      cats.add("pivot");
    } else if (sharers.length === 0 && g.placement <= 4) good.push(`Uncontested ${ctx.traitName(myTop.id)} line.`);
  }

  // damage / aggression
  const ld = lobbyAvg((x) => x.damage);
  if (Number.isFinite(ld) && g.damageToPlayers >= ld * 1.3) good.push(`${g.damageToPlayers} damage to players (lobby average ${fmt(ld, 0)}): your board was strong when it mattered.`);
  else if (Number.isFinite(ld) && g.damageToPlayers <= ld * 0.5 && g.placement >= 5) {
    bad.push(`Only ${g.damageToPlayers} damage to players (lobby average ${fmt(ld, 0)}): the board never had a winning stretch.`);
    cats.add("hp-management");
  }
  if (g.playersEliminated >= 2) good.push(`Eliminated ${g.playersEliminated} players.`);

  // early death
  if (g.lastRound > 0 && g.lastRound <= 18 && !won) {
    bad.push(`Out at ${g.stage}, before 4-1. Stage 2–3 HP is lost to weak boards: slam, play the strongest board, and know whether you are streaking.`);
    cats.add("hp-management");
  }

  notes.push(`${g.queueName} · ${Math.round(g.lengthSec / 60)} min · comp ${g.comp}`);
  if (first) notes.push(`1st place played ${first.comp} at level ${first.level} with ${first.completedItems} items and ${first.threeStars} 3★.`);

  const compare = [
    { label: "Level", you: String(g.level), lobby: fmt(lobbyAvg((x) => x.level)), first: first ? String(first.level) : "—" },
    { label: "Completed items", you: String(mine), lobby: fmt(lobbyAvg((x) => x.completedItems)), first: first ? String(first.completedItems) : "—" },
    { label: "2★ units", you: String(g.units.filter((u) => u.star === 2).length), lobby: fmt(lobbyAvg((x) => x.twoStars)), first: first ? String(first.twoStars) : "—" },
    { label: "3★ units", you: String(threeStars.length), lobby: fmt(lobbyAvg((x) => x.threeStars)), first: first ? String(first.threeStars) : "—" },
    { label: "Gold left", you: String(g.goldLeft), lobby: fmt(lobbyAvg((x) => x.goldLeft), 0), first: first ? String(first.goldLeft) : "—" },
    { label: "Damage to players", you: String(g.damageToPlayers), lobby: fmt(lobbyAvg((x) => x.damage), 0), first: first ? String(first.damage) : "—" },
    { label: "Eliminations", you: String(g.playersEliminated), lobby: fmt(lobbyAvg((x) => x.eliminated)), first: first ? String(first.eliminated) : "—" },
  ];

  const verdict =
    g.placement === 1
      ? "Clean win."
      : g.placement <= 4
        ? bad.length
          ? "Top 4 with a leak that kept it from being a win."
          : "Solid top 4."
        : bad.length >= 3
          ? "Several leaks stacked; the biggest one is listed first."
          : bad.length
            ? "One clear leak decided it."
            : "Nothing obvious in the final state; the loss was probably decided by fights (positioning or matchups).";

  return { verdict, good, bad, notes, compare, categories: [...cats] };
}
