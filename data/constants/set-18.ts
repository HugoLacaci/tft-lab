import type { SetConstants } from "./index";

/**
 * Set 18 · Enchanted Wilds.
 *
 * [VERIFY] status, 2026-09-20:
 *   - shopOdds: from the project brief (marked "verified numbers"). Cross-check
 *     against the in-game shop tooltip on the next patch.
 *   - poolSize: from the brief (30/25/18/10/9).
 *   - distinctChampions: counted from the synced CDragon data (the 5-cost
 *     count includes the nine Lux forms; the pool treats them as one unit each
 *     but the odds calculator uses this number, so adjust if the in-game pool
 *     differs).
 *   - interest, streak brackets, base income, XP thresholds, augment rounds:
 *     long-standing values; RE-VERIFY against the current patch notes. They
 *     have changed between sets before (interest cap, XP curve at 9/10).
 */
const constants: SetConstants = {
  setNumber: 18,
  verifiedOn: "2026-09-20",
  sources: {
    shopOdds: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/",
    poolSize: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/",
    interest: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/",
    xp: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/",
    augments: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/",
  },
  shopOdds: [
    { level: 1, odds: [100, 0, 0, 0, 0] },
    { level: 2, odds: [100, 0, 0, 0, 0] },
    { level: 3, odds: [75, 25, 0, 0, 0] },
    { level: 4, odds: [55, 30, 15, 0, 0] },
    { level: 5, odds: [45, 33, 20, 2, 0] },
    { level: 6, odds: [30, 40, 25, 5, 0] },
    { level: 7, odds: [16, 30, 43, 10, 1] },
    { level: 8, odds: [15, 20, 32, 30, 3] },
    { level: 9, odds: [10, 17, 25, 33, 15] },
    { level: 10, odds: [5, 10, 20, 40, 25] },
    { level: 11, odds: [1, 2, 12, 50, 35] },
  ],
  poolSize: { 1: 30, 2: 25, 3: 18, 4: 10, 5: 9 },
  distinctChampions: { 1: 14, 2: 13, 3: 14, 4: 14, 5: 19 },
  interest: { per: 10, cap: 5 },
  baseIncome: 5,
  streakGold: [
    { streak: "0–1", gold: 0 },
    { streak: "2", gold: 1 },
    { streak: "3", gold: 1 },
    { streak: "4", gold: 2 },
    { streak: "5", gold: 2 },
    { streak: "6+", gold: 3 },
  ],
  xpToLevel: [
    { level: 2, xp: 2 },
    { level: 3, xp: 6 },
    { level: 4, xp: 10 },
    { level: 5, xp: 20 },
    { level: 6, xp: 36 },
    { level: 7, xp: 48 },
    { level: 8, xp: 76 },
    { level: 9, xp: 84 },
    { level: 10, xp: 100 },
  ],
  passiveXp: 2,
  xpPerPurchase: { xp: 4, gold: 4 },
  standardTimings: {
    4: "2-1 (natural)",
    5: "2-5",
    6: "3-2",
    7: "4-1",
    8: "4-2 / 4-5",
    9: "5-1 / 5-5",
    10: "6-2+",
  },
  augmentRounds: ["2-1", "3-2", "4-2"],
  notes: [
    "Streak gold brackets and the 6+ cap have been stable for several sets but are the first thing to re-check on a new set.",
    "XP at 8→9 and 9→10 was changed in past sets; the values here are the long-standing ones.",
  ],
};

export default constants;
