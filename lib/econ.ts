/**
 * Econ projection. Given gold, round, level/XP and a plan, project the next
 * N rounds. Assumptions (stated on the page):
 *   - every round pays base income + interest (floor(gold/10), capped) +
 *     streak gold; the streak continues in the same direction;
 *   - passive XP each round; the "level" plan buys XP every round;
 *   - the "roll" plan spends a fixed amount per round, never below a floor;
 *   - carousel/PvE rounds are treated like any other round (slightly
 *     optimistic for stage income, identical for both plans being compared).
 */
export interface EconConstants {
  baseIncome: number;
  interest: { per: number; cap: number };
  streakGold: { streak: string; gold: number }[];
  xpToLevel: { level: number; xp: number }[];
  passiveXp: number;
  xpPerPurchase: { xp: number; gold: number };
}

export type Plan = { type: "save" } | { type: "level"; purchasesPerRound: number; stopAtLevel?: number } | { type: "roll"; goldPerRound: number; floor: number };

export interface EconState {
  stage: string; // "3-2"
  gold: number;
  level: number;
  xp: number; // xp into current level
  streak: { type: "win" | "loss"; count: number };
}

export interface RoundRow {
  stage: string;
  goldStart: number;
  spent: number;
  income: number;
  interest: number;
  streakGold: number;
  goldEnd: number;
  level: number;
  xp: number;
  xpNeeded: number;
}

export function streakGold(count: number, table: EconConstants["streakGold"]): number {
  // table rows like "0–1", "2", "3", "4", "5", "6+"
  let best = 0;
  for (const row of table) {
    const m = row.streak.match(/^(\d+)(?:[–-](\d+)|\+)?$/);
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = row.streak.endsWith("+") ? Infinity : m[2] ? Number(m[2]) : lo;
    if (count >= lo && count <= hi) best = row.gold;
  }
  return best;
}

export function interestFor(gold: number, k: EconConstants["interest"]): number {
  return Math.min(k.cap, Math.floor(gold / k.per));
}

export function xpNeeded(level: number, k: EconConstants): number {
  return k.xpToLevel.find((r) => r.level === level + 1)?.xp ?? Infinity;
}

export function nextStage(stage: string): string {
  const [s, r] = stage.split("-").map(Number) as [number, number];
  const roundsInStage = s === 1 ? 4 : 7;
  return r >= roundsInStage ? `${s + 1}-1` : `${s}-${r + 1}`;
}

export function project(start: EconState, plan: Plan, k: EconConstants, rounds = 5): RoundRow[] {
  const rows: RoundRow[] = [];
  let st = { ...start, streak: { ...start.streak } };
  for (let i = 0; i < rounds; i++) {
    const goldStart = st.gold;
    let spent = 0;
    let level = st.level;
    let xp = st.xp + k.passiveXp;

    if (plan.type === "level" && (!plan.stopAtLevel || level < plan.stopAtLevel)) {
      for (let n = 0; n < plan.purchasesPerRound; n++) {
        if (st.gold - spent < k.xpPerPurchase.gold) break;
        if (plan.stopAtLevel && level >= plan.stopAtLevel) break;
        spent += k.xpPerPurchase.gold;
        xp += k.xpPerPurchase.xp;
        while (xp >= xpNeeded(level, k)) {
          xp -= xpNeeded(level, k);
          level++;
        }
      }
    } else if (plan.type === "roll") {
      const can = Math.max(0, st.gold - plan.floor);
      spent = Math.min(plan.goldPerRound, can);
    }
    while (xp >= xpNeeded(level, k)) {
      xp -= xpNeeded(level, k);
      level++;
    }

    const afterSpend = goldStart - spent;
    const interest = interestFor(afterSpend, k.interest);
    const sg = streakGold(st.streak.count, k.streakGold);
    const income = k.baseIncome + interest + sg;
    const goldEnd = afterSpend + income;
    rows.push({ stage: st.stage, goldStart, spent, income, interest, streakGold: sg, goldEnd, level, xp, xpNeeded: xpNeeded(level, k) });
    st = { stage: nextStage(st.stage), gold: goldEnd, level, xp, streak: { type: st.streak.type, count: st.streak.count + 1 } };
  }
  return rows;
}
