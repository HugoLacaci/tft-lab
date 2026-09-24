import type { BenchUnit, Decision, GameTimeline, PlacedUnit, RoundState } from "./types";

/**
 * deriveDecisions: the diff between consecutive RoundStates, i.e. what the
 * player did. Pure and deterministic; every number is either read from the
 * two states or solved from the explicit accounting equation
 *
 *   goldStart + income + sold − bought − xpBought·xpGold − rolls·rollCost − goldEnd = residual
 *
 * Rolls are the one unknown. When the residual is not a whole, non-negative
 * number of rolls, `rolls` is the best whole guess, the residual is kept and
 * `lowConfidence` is set with a note. Nothing is ever absorbed silently.
 */
export interface EconRules {
  /** base income by stage number (index = stage number) */
  baseIncome: (stageNumber: number, roundNumber: number) => number;
  interest: { per: number; cap: number };
  streakGold: (count: number) => number;
  xpPerPurchase: { xp: number; gold: number };
  passiveXp: number;
  rollCost: number;
  /** unit cost by championId (1..5); unknown ids → 0 with a note */
  costOf: (championId: string) => number | undefined;
  /** completed item → its two components, when the set data knows the recipe */
  recipeOf?: (itemId: string) => string[] | undefined;
}

/** Long-standing values; callers pass the live set's constants via rulesFromConstants. */
export const DEFAULT_RULES: EconRules = {
  baseIncome: (stage, round) => (stage >= 3 ? 5 : stage === 2 ? (round === 1 ? 4 : 5) : round <= 3 ? 2 : 3),
  interest: { per: 10, cap: 5 },
  streakGold: (n) => (n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0),
  xpPerPurchase: { xp: 4, gold: 4 },
  passiveXp: 2,
  rollCost: 2,
  costOf: () => undefined,
};

export function interestOn(gold: number, rules: Pick<EconRules, "interest"> = DEFAULT_RULES): number {
  return Math.min(rules.interest.cap, Math.floor(gold / rules.interest.per));
}

/** Copies a unit represents: 1★ = 1, 2★ = 3, 3★ = 9. */
export function copiesOf(star: 1 | 2 | 3): number {
  return star === 3 ? 9 : star === 2 ? 3 : 1;
}

function copyCounts(units: (PlacedUnit | BenchUnit)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of units) m.set(u.championId, (m.get(u.championId) ?? 0) + copiesOf(u.star));
  return m;
}

function maxStar(units: (PlacedUnit | BenchUnit)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of units) m.set(u.championId, Math.max(m.get(u.championId) ?? 0, u.star));
  return m;
}

function sameStage(a: RoundState, b: RoundState): boolean {
  return a.stage === b.stage;
}

/** Income that arrives when the game moves from state a's round to state b's round. */
export function estimateIncome(a: RoundState, b: RoundState, rules: EconRules): number {
  if (sameStage(a, b)) return 0;
  const base = rules.baseIncome(b.stageNumber, b.roundNumber);
  const interest = interestOn(a.gold, rules);
  // The streak paid at b's income is the streak standing after a's combat, which b reports.
  const streak = rules.streakGold(b.streak.count);
  return base + interest + streak;
}

export function deriveDecision(a: RoundState, b: RoundState, fromIndex: number, toIndex: number, rules: EconRules = DEFAULT_RULES): Decision {
  const notes: string[] = [];
  const evidence: Decision["evidence"] = [];
  const ev = (s: RoundState, field: string, value: unknown) => evidence.push({ stage: s.stage, field, value: String(value), confidence: s.confidence[field] ?? (s.provenance === "vision" ? undefined : 1) });

  // Income between the two states: observed events + (estimated) round income.
  const observed = (b.incomeEvents ?? []).reduce((acc, e) => acc + e.gold, 0);
  const roundIncome = estimateIncome(a, b, rules);
  const incomeEstimated = roundIncome !== 0;
  const income = roundIncome + observed;
  ev(a, "gold", a.gold);
  ev(b, "gold", b.gold);

  // Units: copies per champion across board + bench, before and after.
  const before = copyCounts([...a.board, ...a.bench]);
  const after = copyCounts([...b.board, ...b.bench]);
  const bought: Decision["bought"] = [];
  const sold: Decision["sold"] = [];
  let boughtGold = 0;
  let soldGold = 0;
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const d = (after.get(id) ?? 0) - (before.get(id) ?? 0);
    const cost = rules.costOf(id);
    if (cost === undefined && d !== 0) notes.push(`unknown cost for ${id}; its ${Math.abs(d)} cop${Math.abs(d) === 1 ? "y" : "ies"} are counted at 0 gold`);
    const c = cost ?? 0;
    if (d > 0) {
      bought.push({ championId: id, copies: d, cost: c });
      boughtGold += d * c;
    } else if (d < 0) {
      // Selling a 2★ 1-cost returns 3, i.e. copies × cost (except 1-costs sell 2★ for 3: copies × cost holds).
      sold.push({ championId: id, copies: -d, gold: -d * c });
      soldGold += -d * c;
    }
  }

  // Star-ups: champions whose best star rose.
  const starBefore = maxStar([...a.board, ...a.bench]);
  const starAfter = maxStar([...b.board, ...b.bench]);
  const starUpsAchieved: Decision["starUpsAchieved"] = [];
  for (const [id, s] of starAfter) if (s > (starBefore.get(id) ?? 0) && (s === 2 || s === 3)) starUpsAchieved.push({ championId: id, star: s });

  // XP: purchases inferred from the xp bar; passive XP arrives with round income only.
  const levelled = b.level > a.level;
  let xpGained: number;
  if (b.level === a.level) xpGained = b.xp.current - a.xp.current;
  else if (b.level === a.level + 1) xpGained = a.xp.needed - a.xp.current + b.xp.current;
  else {
    xpGained = a.xp.needed - a.xp.current + b.xp.current + (b.level - a.level - 1) * a.xp.needed;
    notes.push(`level rose by ${b.level - a.level} in one step; XP between the two states is approximate`);
  }
  const passive = sameStage(a, b) ? 0 : rules.passiveXp;
  const boughtXp = Math.max(0, xpGained - passive);
  let xpBought = boughtXp / rules.xpPerPurchase.xp;
  if (!Number.isInteger(xpBought)) {
    notes.push(`XP gained (${boughtXp} beyond passive) is not a whole number of purchases`);
    xpBought = Math.round(xpBought);
  }
  ev(a, "level", a.level);
  ev(b, "level", b.level);
  if (xpBought > 0) {
    ev(a, "xp.current", a.xp.current);
    ev(b, "xp.current", b.xp.current);
  }
  const xpGold = xpBought * rules.xpPerPurchase.gold;

  // Solve for rolls.
  const available = a.gold + income + soldGold;
  const unexplained = available - boughtGold - xpGold - b.gold;
  let rolls = 0;
  let residual = unexplained;
  if (unexplained >= 0 && unexplained % rules.rollCost === 0) {
    rolls = unexplained / rules.rollCost;
    residual = 0;
  } else if (unexplained > 0) {
    rolls = Math.floor(unexplained / rules.rollCost);
    residual = unexplained - rolls * rules.rollCost;
    notes.push(`${residual} gold unexplained after ${rolls} roll${rolls === 1 ? "" : "s"}: an unrecorded income event, a missed buy, or a misread gold value`);
  } else {
    notes.push(`gold rose by ${-unexplained} more than the known income explains: an unrecorded income event or a misread gold value`);
  }
  // A roll must show in the shop.
  if (rolls > 0 && sameStage(a, b) && a.shop.every((s, i) => s === b.shop[i])) {
    notes.push("gold says the shop was rolled but the shop shows the same five units");
  }
  if (rolls > 0) {
    ev(a, "shop", a.shop.filter(Boolean).join(", ") || "empty");
    ev(b, "shop", b.shop.filter(Boolean).join(", ") || "empty");
  }

  // Items.
  const itemsEquipped: Decision["itemsEquipped"] = [];
  const itemsCombined: Decision["itemsCombined"] = [];
  const heldBefore = new Map<string, string[]>();
  for (const u of [...a.board, ...a.bench]) heldBefore.set(u.championId, [...(heldBefore.get(u.championId) ?? []), ...u.items]);
  const poolBefore = [...a.benchItems];
  for (const u of [...b.board, ...b.bench]) {
    const had = [...(heldBefore.get(u.championId) ?? [])];
    for (const it of u.items) {
      const i = had.indexOf(it);
      if (i >= 0) {
        had.splice(i, 1);
        continue;
      }
      itemsEquipped.push({ itemId: it, toUnitId: u.championId });
      // Combined from two components that disappeared? Components no longer anywhere after.
      const j = poolBefore.indexOf(it);
      if (j >= 0) poolBefore.splice(j, 1);
    }
  }
  const afterAll = new Set<string>([...b.benchItems, ...[...b.board, ...b.bench].flatMap((u) => u.items)]);
  const vanished = [...a.benchItems, ...[...a.board, ...a.bench].flatMap((u) => u.items)].filter((it) => !afterAll.has(it));
  for (const e of itemsEquipped) {
    if (a.benchItems.includes(e.itemId)) continue; // moved from the bench, not built
    // The new item was not on the bench before: it was built from vanished components.
    const recipe = rules.recipeOf?.(e.itemId);
    if (recipe && recipe.length === 2) {
      const take = recipe.map((c) => vanished.indexOf(c));
      if (take.every((i) => i >= 0) && (take[0] !== take[1] || vanished.filter((v) => v === recipe[0]).length >= 2)) {
        const from: string[] = [];
        for (const c of recipe) {
          const i = vanished.indexOf(c);
          from.push(vanished.splice(i, 1)[0]!);
        }
        itemsCombined.push({ from, to: e.itemId });
        continue;
      }
      notes.push(`${e.itemId} appeared but its components (${recipe.join(" + ")}) were not both seen leaving; components paired by elimination`);
    }
    if (vanished.length >= 2) itemsCombined.push({ from: vanished.splice(0, 2), to: e.itemId });
    else if (!recipe) notes.push(`${e.itemId} appeared without two components leaving and without a known recipe`);
  }
  if (itemsEquipped.length) {
    ev(a, "benchItems", a.benchItems.join(", ") || "none");
    ev(b, "benchItems", b.benchItems.join(", ") || "none");
  }

  // Repositioning: same champion on the board in both, different hex (ambiguous with duplicates).
  const repositioned: Decision["repositioned"] = [];
  const byIdA = new Map<string, PlacedUnit[]>();
  for (const u of a.board) byIdA.set(u.championId, [...(byIdA.get(u.championId) ?? []), u]);
  for (const u of b.board) {
    const prev = byIdA.get(u.championId);
    if (!prev?.length) continue;
    const same = prev.find((p) => p.row === u.row && p.col === u.col);
    if (same) {
      prev.splice(prev.indexOf(same), 1);
      continue;
    }
    const p = prev.shift()!;
    repositioned.push({ unitId: u.championId, from: { row: p.row, col: p.col }, to: { row: u.row, col: u.col } });
  }

  // Augment.
  let augmentPicked: Decision["augmentPicked"];
  const newAug = b.augments.find((x) => !a.augments.includes(x));
  if (newAug) {
    augmentPicked = { chosen: newAug, offered: a.augmentOptions ?? b.augmentOptions ?? [newAug] };
    ev(b, "augments", newAug);
  }

  const healthLost = Math.max(0, a.health - b.health);
  if (healthLost) {
    ev(a, "health", a.health);
    ev(b, "health", b.health);
  }

  // Low confidence: residual, perception doubts on gold, or unknown costs.
  const lowGoldConf = (s: RoundState) => (s.confidence.gold ?? 1) < 0.8;
  if (lowGoldConf(a) || lowGoldConf(b)) notes.push("gold was read with low confidence");
  const lowConfidence = residual !== 0 || notes.length > 0;

  const spent = boughtGold + xpGold + rolls * rules.rollCost;
  return {
    fromStage: a.stage,
    toStage: b.stage,
    fromIndex,
    toIndex,
    goldStart: a.gold,
    goldEnd: b.gold,
    income,
    incomeEstimated,
    goldSpent: spent,
    interestLost: Math.max(0, interestOn(a.gold + income, rules) - interestOn(b.gold, rules)),
    rolls,
    xpBought,
    levelled,
    bought: bought.sort((x, y) => x.championId.localeCompare(y.championId)),
    sold: sold.sort((x, y) => x.championId.localeCompare(y.championId)),
    itemsEquipped,
    itemsCombined,
    repositioned,
    ...(augmentPicked ? { augmentPicked } : {}),
    starUpsAchieved,
    healthLost,
    residual,
    lowConfidence,
    ...(notes.length ? { notes } : {}),
    evidence,
  };
}

export function deriveDecisions(timeline: GameTimeline, rules: EconRules = DEFAULT_RULES): Decision[] {
  const out: Decision[] = [];
  for (let i = 0; i + 1 < timeline.rounds.length; i++) out.push(deriveDecision(timeline.rounds[i]!, timeline.rounds[i + 1]!, i, i + 1, rules));
  return out;
}

/** Stage "4-2" → { stageNumber: 4, roundNumber: 2 }. */
export function parseStage(stage: string): { stageNumber: number; roundNumber: number } {
  const [s, r] = stage.split("-").map(Number);
  return { stageNumber: s ?? 0, roundNumber: r ?? 0 };
}
