// Hand-built fixture timelines, written as terse per-round specs and expanded
// into full GameTimeline JSON. The expansion applies the same accounting the
// decision layer solves for, so a fixture is balanced by construction unless a
// round says otherwise (see the `vision` gap in fast-9-failed-rolldown).
//
//   node packages/ontology/fixtures/build.mjs
//
// The JSON output is committed; this script is how it was made.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "..", "data", "generated", "set-18.json"), "utf8"));
const cost = Object.fromEntries(set.champions.map((c) => [c.id, c.cost]));
const traitsOf = Object.fromEntries(set.champions.map((c) => [c.id, c.traits]));
const traitBreak = Object.fromEntries(set.traits.map((t) => [t.id, t.breakpoints ?? []]));
// XP needed while AT a level to reach the next (matches data/constants/set-18.ts).
const XP_TO = { 1: 2, 2: 2, 3: 6, 4: 10, 5: 20, 6: 36, 7: 56, 8: 80, 9: 84, 10: 100 };
const base = (s, r) => (s >= 3 ? 5 : s === 2 ? (r === 1 ? 4 : 5) : r <= 3 ? 2 : 3);
const interest = (g) => Math.min(5, Math.floor(g / 10));
const streakGold = (n) => (n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);
const copies = (star) => (star === 3 ? 9 : star === 2 ? 3 : 1);

const U = (championId, row, col, star = 1, items = []) => ({ championId, row, col, star, items });
const B = (championId, star = 1, items = [], slot) => ({ championId, star, items, ...(slot !== undefined ? { slot } : {}) });

function activeTraits(board) {
  const counts = new Map();
  const seen = new Map();
  for (const u of board) {
    if (seen.has(u.championId)) continue; // duplicates of one champion count once
    seen.set(u.championId, true);
    for (const t of traitsOf[u.championId] ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const out = [];
  for (const [traitId, count] of counts) {
    const bps = traitBreak[traitId] ?? [];
    const hit = [...bps].reverse().find((b) => count >= b.units);
    if (hit) out.push({ traitId, count, style: hit.style });
  }
  return out.sort((a, b) => a.traitId.localeCompare(b.traitId));
}

function countCopies(units) {
  const m = new Map();
  for (const u of units) m.set(u.championId, (m.get(u.championId) ?? 0) + copies(u.star));
  return m;
}

/** Expand a game spec into a GameTimeline. */
function build(game) {
  const rounds = [];
  let gold = game.startGold;
  let level = game.startLevel;
  let xp = { ...game.startXp };
  let board = game.startBoard ?? [];
  let bench = game.startBench ?? [];
  let benchItems = game.startItems ?? [];
  let augments = [];
  let prevEnd = null;
  let ts = game.videoStartMs ?? null;

  const gainXp = (n) => {
    xp.current += n;
    while (level < 10 && xp.current >= xp.needed) {
      xp.current -= xp.needed;
      level += 1;
      xp.needed = XP_TO[level] ?? 999;
    }
  };

  game.rounds.forEach((r, i) => {
    const [stageNumber, roundNumber] = r.s.split("-").map(Number);
    const events = [];
    // Income arriving with this round (not for the first state of the game).
    if (prevEnd) {
      gold += base(stageNumber, roundNumber) + interest(prevEnd.gold) + streakGold(r.st[1]);
      gainXp(2);
    }
    if (r.pve) {
      events.push({ kind: "pve-drop", gold: r.pve.gold ?? 0, note: r.pve.note ?? "PvE round drop" });
      gold += r.pve.gold ?? 0;
      benchItems = [...benchItems, ...(r.pve.items ?? [])];
    }
    if (r.car) {
      // Carousel: a free unit with an item. Offsets the unit's cost in the accounting.
      const c = cost[r.car.id];
      events.push({ kind: "carousel", gold: c, note: `carousel pick: ${r.car.id} holding ${r.car.item}` });
      gold += c; // paid by the event…
      gold -= c; // …and "bought" at cost, so the accounting equation closes on the unit's copies
      bench = [...bench, B(r.car.id, 1, [])];
      benchItems = [...benchItems, r.car.item];
    }
    for (const e of r.ev ?? []) {
      events.push(e);
      gold += e.gold;
    }
    const phase = r.aug ? "augment-select" : r.car ? "carousel" : "planning";
    const common = {
      matchId: game.matchId,
      stage: r.s,
      stageNumber,
      roundNumber,
      health: r.hp,
      streak: { type: r.st[0], count: r.st[1] },
      provenance: "manual",
      confidence: {},
    };
    const startShop = r.shop ?? [null, null, null, null, null];
    const start = {
      ...common,
      phase,
      phaseMoment: "start",
      ...(ts !== null ? { videoTimestampMs: ts } : {}),
      gold,
      level,
      xp: { ...xp },
      board: board.map((u) => ({ ...u, items: [...u.items] })),
      bench: bench.map((u) => ({ ...u, items: [...u.items] })),
      shop: startShop,
      benchItems: [...benchItems],
      activeTraits: activeTraits(board),
      augments: [...augments],
      ...(r.aug ? { augmentOptions: r.aug.opts } : {}),
      ...(events.length ? { incomeEvents: events } : {}),
      ...(r.opp ? { opponentPreview: r.opp } : {}),
      ...(r.lobby ? { lobby: r.lobby } : {}),
    };
    if (ts !== null) ts += 30_000;

    // Actions.
    let spent = 0;
    for (const id of r.buy ?? []) {
      if (cost[id] === undefined) throw new Error(`${game.matchId} ${r.s}: unknown champion ${id}`);
      spent += cost[id];
    }
    let refund = 0;
    for (const [id, star] of r.sell ?? []) refund += copies(star) * cost[id];
    spent += (r.xp ?? 0) * 4 + (r.roll ?? 0) * 2;
    gold = gold + refund - spent;
    if (process.env.TRACE) console.log(game.matchId, r.s, "start", start.gold, "→ end", gold, "L" + level, xp.current + "/" + xp.needed);
    if (gold < 0) throw new Error(`${game.matchId} ${r.s}: gold went negative (${gold})`);
    gainXp((r.xp ?? 0) * 4);
    if (r.board) board = r.board;
    if (r.bench) bench = r.bench;
    if (r.items) benchItems = r.items;
    if (r.aug) augments = [...augments, r.aug.pick];
    if (board.length > level) throw new Error(`${game.matchId} ${r.s}: ${board.length} units on board at level ${level}`);

    // Copies must match buys/sells/carousel.
    const before = countCopies([...start.board, ...start.bench]);
    const after = countCopies([...board, ...bench]);
    const expected = new Map(before);
    for (const id of r.buy ?? []) expected.set(id, (expected.get(id) ?? 0) + 1);
    for (const [id, star] of r.sell ?? []) expected.set(id, (expected.get(id) ?? 0) - copies(star));
    for (const id of new Set([...expected.keys(), ...after.keys()])) {
      if ((expected.get(id) ?? 0) !== (after.get(id) ?? 0)) throw new Error(`${game.matchId} ${r.s}: ${id} copies expected ${expected.get(id) ?? 0}, board+bench show ${after.get(id) ?? 0}`);
    }

    const end = {
      ...common,
      phase: "planning",
      phaseMoment: "end",
      ...(ts !== null ? { videoTimestampMs: ts } : {}),
      gold: r.vision ? r.vision.gold : gold,
      level,
      xp: { ...xp },
      board: board.map((u) => ({ ...u, items: [...u.items] })),
      bench: bench.map((u) => ({ ...u, items: [...u.items] })),
      shop: r.shopEnd ?? startShop.map((s) => ((r.buy ?? []).includes(s) ? null : s)),
      benchItems: [...benchItems],
      activeTraits: activeTraits(board),
      augments: [...augments],
      ...(r.opp ? { opponentPreview: r.opp } : {}),
      ...(r.vision ? { provenance: "vision", confidence: { gold: r.vision.conf } } : {}),
    };
    if (ts !== null) ts += 60_000;
    rounds.push(start, end);
    prevEnd = { gold };
    void i;
  });
  return {
    matchId: game.matchId,
    setNumber: 18,
    patch: game.patch,
    playerName: game.playerName,
    source: "fixture",
    rounds,
    finalPlacement: game.finalPlacement,
    title: game.title,
    notes: game.notes,
  };
}

// ── Game A: Blossom tempo into Ahri, standard timings, a 3rd ────────────────
const AUG1 = ["DA_BirthdayReunion", "DA_SpreadingRoots", "DA_TraitLadder"];
const gameA = {
  matchId: "fixture-blossom-tempo-3rd",
  title: "Blossom tempo into Ahri: a standard 3rd",
  patch: "18.3",
  playerName: "Seat 5",
  finalPlacement: 3,
  notes: "Hand-built. Standard level timings, two slams by 3-2, no stage-3 roll, level 7 at 4-1 and a 4-2 rolldown at 7 that spends down to 1 gold. Every round of stage 2 and 3 is present so the accounting closes without estimates beyond round income.",
  videoStartMs: 60_000,
  startGold: 12,
  startLevel: 3,
  startXp: { current: 6, needed: 10 },
  startBoard: [U("DA_18_Leona", 0, 2), U("DA_18_Yorick", 0, 3), U("DA_Karma18", 3, 3)],
  startItems: ["DA_Component_BFSword", "DA_Component_NeedlesslyLargeRod"],
  rounds: [
    { s: "2-1", hp: 100, st: ["win", 0], shop: ["DA_Karma18", "DA_18_Kobuko", "DA_18_Varus", "DA_18_Xayah", "DA_18_Ornn"], aug: { opts: AUG1, pick: "DA_BirthdayReunion" }, buy: ["DA_Karma18", "DA_18_Kobuko"], xp: 1, board: [U("DA_18_Leona", 0, 2), U("DA_18_Yorick", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3)], bench: [B("DA_Karma18")], items: ["DA_Component_BFSword", "DA_Component_NeedlesslyLargeRod"] },
    { s: "2-2", hp: 100, st: ["win", 1], shop: ["DA_18_Yorick", "DA_18_Leona", "DA_18_Caitlyn", "DA_18_Warwick", "DA_18_Sejuani"], buy: ["DA_18_Yorick", "DA_18_Leona"], bench: [B("DA_Karma18"), B("DA_18_Yorick"), B("DA_18_Leona")] },
    { s: "2-3", hp: 100, st: ["win", 2], shop: ["DA_Karma18", "DA_18_RekSai", "DA_18_Elise", "DA_18_Varus", "DA_18_Yunara"], buy: ["DA_Karma18", "DA_18_Yunara"], board: [U("DA_18_Leona", 0, 2), U("DA_18_Yorick", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_Component_NeedlesslyLargeRod"])], bench: [B("DA_18_Yorick"), B("DA_18_Leona"), B("DA_18_Yunara")], items: ["DA_Component_BFSword"] },
    { s: "2-4", hp: 100, st: ["win", 3], car: { id: "DA_18_Yunara", item: "DA_Component_TearOfTheGoddess" }, bench: [B("DA_18_Yorick"), B("DA_18_Leona"), B("DA_18_Yunara"), B("DA_18_Yunara")] },
    { s: "2-5", hp: 100, st: ["win", 4], shop: ["DA_18_Yunara", "DA_18_Shen", "DA_18_Kayle", "DA_18_Kobuko", "DA_18_Xayah"], buy: ["DA_18_Yunara"], xp: 3, board: [U("DA_18_Leona", 0, 2), U("DA_18_Yorick", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2)], bench: [B("DA_18_Yorick"), B("DA_18_Leona")], items: ["DA_Component_BFSword"] },
    { s: "2-6", hp: 100, st: ["win", 5], shop: ["DA_18_Leona", "DA_18_Warwick", "DA_18_Sejuani", "DA_18_Caitlyn", "DA_18_Ornn"], buy: ["DA_18_Leona"], board: [U("DA_18_Leona", 0, 3, 2), U("DA_18_Yorick", 0, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2)], bench: [B("DA_18_Yorick")] },
    { s: "2-7", hp: 100, st: ["win", 6], pve: { gold: 2, items: ["DA_Component_ChainVest", "DA_Component_GiantsBelt"] }, board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2)], items: ["DA_Component_BFSword"] },
    { s: "3-1", hp: 100, st: ["win", 7], shop: ["DA_18_Cassiopeia", "DA_18_Yorick", "DA_18_Shen", "DA_18_Xayah", "DA_18_Sejuani"], buy: ["DA_18_Yorick"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2)], bench: [] },
    { s: "3-2", hp: 94, st: ["loss", 1], shop: ["DA_18_Ahri", "DA_18_Sett", "DA_18_Hecarim", "DA_18_Varus", "DA_18_Caitlyn"], aug: { opts: ["DA_SpreadingRoots", "DA_TraitLadder", "DA_BirthdayReunion"], pick: "DA_SpreadingRoots" }, buy: ["DA_18_Ahri"], xp: 7, board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2), U("DA_18_Ahri", 3, 1)], bench: [] },
    { s: "3-3", hp: 88, st: ["loss", 2], shop: ["DA_18_Kayle", "DA_18_Elise", "DA_18_Warwick", "DA_18_Xayah", "DA_18_Ornn"] },
    { s: "3-4", hp: 88, st: ["win", 1], car: { id: "DA_18_Sett", item: "DA_Component_RecurveBow" }, bench: [B("DA_18_Sett")] },
    { s: "3-5", hp: 88, st: ["win", 2], shop: ["DA_18_Sett", "DA_18_Ahri", "DA_18_Rammus", "DA_18_Shen", "DA_18_Yunara"], buy: ["DA_18_Sett", "DA_18_Ahri"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2), U("DA_18_Ahri", 3, 1)], bench: [B("DA_18_Sett"), B("DA_18_Sett"), B("DA_18_Ahri")] },
    { s: "3-6", hp: 82, st: ["loss", 1], shop: ["DA_18_Varus", "DA_18_Leona", "DA_18_Tristana", "DA_18_Cassiopeia", "DA_18_Sejuani"] },
    { s: "3-7", hp: 82, st: ["win", 1], pve: { gold: 3, items: ["DA_Component_SparringGloves"] }, board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Kobuko", 0, 4), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2, ["DA_LastWhisper"]), U("DA_18_Ahri", 3, 1)], items: ["DA_Component_BFSword"] },
    { s: "4-1", hp: 82, st: ["win", 2], shop: ["DA_18_Sett", "DA_18_Morgana", "DA_18_Ahri", "DA_18_Hecarim", "DA_18_Kayle"], buy: ["DA_18_Sett", "DA_18_Ahri"], xp: 9, board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Sett", 0, 4, 2), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2, ["DA_LastWhisper"]), U("DA_18_Ahri", 3, 1, 2), U("DA_18_Kobuko", 1, 4)], bench: [] },
    { s: "4-2", hp: 76, st: ["loss", 1], shop: ["DA_18_Ashe", "DA_18_Malphite", "DA_18_Ahri", "DA_18_Lillia", "DA_18_Sett"], aug: { opts: ["DA_TraitLadder", "DA_SpreadingRoots", "DA_BirthdayReunion"], pick: "DA_TraitLadder" }, roll: 8, buy: ["DA_18_Lillia", "DA_18_Malphite", "DA_18_Ahri"], sell: [["DA_18_Kobuko", 1]], shopEnd: ["DA_18_Kayle", null, "DA_18_Sivir", null, "DA_18_Varus"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_SunfireCape"]), U("DA_18_Yorick", 0, 2, 2), U("DA_18_Sett", 0, 4, 2), U("DA_18_Lillia", 1, 3), U("DA_Karma18", 3, 3, 2, ["DA_ArchangelsStaff"]), U("DA_18_Yunara", 3, 5, 2, ["DA_LastWhisper"]), U("DA_18_Ahri", 3, 1, 2)], bench: [B("DA_18_Ahri"), B("DA_18_Malphite")], items: ["DA_Component_BFSword"], opp: [U("DA_18_Rammus", 0, 3, 2, ["DA_GargoyleStoneplate"]), U("DA_18_Hecarim", 0, 2, 2), U("DA_18_Cassiopeia", 3, 4, 2, ["DA_RabadonsDeathcap"]), U("DA_18_Morgana", 3, 2), U("DA_18_Elise", 0, 4, 2), U("DA_18_Caitlyn", 3, 6, 2)], lobby: [{ playerName: "Seat 1", health: 91, level: 7 }, { playerName: "Seat 2", health: 44, level: 7 }, { playerName: "Seat 3", health: 70, level: 8 }, { playerName: "Seat 4", health: 58, level: 7 }, { playerName: "Seat 6", health: 22, level: 6 }, { playerName: "Seat 7", health: 66, level: 7 }, { playerName: "Seat 8", health: 39, level: 7 }] },
  ],
};

// ── Game B: Kha'Zix reroll, slow roll above 50, a 2nd ─────────────────────
const gameB = {
  matchId: "fixture-khazix-reroll-2nd",
  title: "Kha'Zix reroll: slow-rolling to the 3-star",
  patch: "18.3",
  playerName: "Seat 2",
  finalPlacement: 2,
  notes: "Hand-built. Kha'Zix by 2-3, level 5 at 3-1 with a small roll, level 6 at 3-5, slow roll above 50 through stage 4; never a second Rival on the board.",
  startGold: 10,
  startLevel: 3,
  startXp: { current: 6, needed: 10 },
  startBoard: [U("DA_18_Leona", 0, 3), U("DA_18_Varus", 3, 3)],
  startItems: ["DA_Component_ChainVest", "DA_Component_BFSword"],
  rounds: [
    { s: "2-1", hp: 100, st: ["win", 0], shop: ["DA_18_RekSai", "DA_18_Varus", "DA_18_Kobuko", "DA_18_Warwick", "DA_18_Leona"], aug: { opts: AUG1, pick: "DA_SpreadingRoots" }, buy: ["DA_18_RekSai", "DA_18_Warwick"], xp: 1, board: [U("DA_18_Leona", 0, 3), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4), U("DA_18_Varus", 3, 3)], bench: [], items: ["DA_Component_ChainVest", "DA_Component_BFSword"] },
    { s: "2-2", hp: 100, st: ["win", 1], shop: ["DA_18_Warwick", "DA_18_Kayle", "DA_18_Xayah", "DA_18_Leona", "DA_18_Ornn"], buy: ["DA_18_Warwick", "DA_18_Leona"], bench: [B("DA_18_Warwick"), B("DA_18_Leona")] },
    { s: "2-3", hp: 100, st: ["win", 2], shop: ["DA_18_KhaZix", "DA_18_Elise", "DA_18_Varus", "DA_18_Kobuko", "DA_18_RekSai"], buy: ["DA_18_KhaZix", "DA_18_Warwick"], board: [U("DA_18_Leona", 0, 3), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 1, ["DA_Component_BFSword"])], bench: [B("DA_18_Leona"), B("DA_18_Varus")], items: ["DA_Component_ChainVest"] },
    { s: "2-4", hp: 100, st: ["win", 3], car: { id: "DA_18_KhaZix", item: "DA_Component_SparringGloves" }, bench: [B("DA_18_Leona"), B("DA_18_Varus"), B("DA_18_KhaZix")] },
    { s: "2-5", hp: 100, st: ["win", 4], shop: ["DA_18_Leona", "DA_18_Shen", "DA_18_Diana", "DA_18_Xayah", "DA_18_Sejuani"], buy: ["DA_18_Leona"], xp: 3, board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 1, ["DA_Component_BFSword", "DA_Component_SparringGloves"]), U("DA_18_Varus", 3, 3)], bench: [B("DA_18_KhaZix")], items: [] },
    { s: "2-6", hp: 96, st: ["loss", 1], shop: ["DA_18_Kayle", "DA_18_Ornn", "DA_18_Elise", "DA_18_Caitlyn", "DA_18_Yorick"] },
    { s: "2-7", hp: 96, st: ["win", 1], pve: { gold: 2, items: ["DA_Component_RecurveBow", "DA_Component_NegatronCloak"] }, board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 1, ["DA_InfinityEdge"]), U("DA_18_Varus", 3, 3)], items: ["DA_Component_RecurveBow", "DA_Component_NegatronCloak"] },
    { s: "3-1", hp: 96, st: ["win", 2], shop: ["DA_18_KhaZix", "DA_18_Rammus", "DA_18_Shen", "DA_18_Varus", "DA_18_Diana"], xp: 1, buy: ["DA_18_KhaZix"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 2, ["DA_InfinityEdge"]), U("DA_18_Varus", 3, 3)], bench: [] },
    { s: "3-2", hp: 96, st: ["win", 3], shop: ["DA_18_Rammus", "DA_18_Warwick", "DA_18_Sejuani", "DA_18_Hecarim", "DA_18_Kobuko"], aug: { opts: ["DA_TraitLadder", "DA_BirthdayReunion", "DA_SpreadingRoots"], pick: "DA_BirthdayReunion" }, xp: 3, buy: ["DA_18_Rammus", "DA_18_Warwick"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 2, ["DA_InfinityEdge"]), U("DA_18_Varus", 3, 3), U("DA_18_Rammus", 0, 1)], bench: [B("DA_18_Warwick")] },
    { s: "3-3", hp: 90, st: ["loss", 1], shop: ["DA_18_Caitlyn", "DA_18_Yunara", "DA_18_Xayah", "DA_18_Kayle", "DA_18_Elise"] },
    { s: "3-4", hp: 90, st: ["win", 1], car: { id: "DA_18_Rammus", item: "DA_Component_GiantsBelt" }, bench: [B("DA_18_Warwick"), B("DA_18_Rammus")] },
    { s: "3-5", hp: 90, st: ["win", 2], shop: ["DA_18_KhaZix", "DA_18_Rammus", "DA_18_Leona", "DA_18_Diana", "DA_18_Shen"], buy: ["DA_18_KhaZix", "DA_18_Rammus"], roll: 3, shopEnd: ["DA_18_Hecarim", "DA_18_Warwick", null, "DA_18_Varus", "DA_18_Tristana"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest", "DA_Component_GiantsBelt"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 2, ["DA_InfinityEdge"]), U("DA_18_Varus", 3, 3), U("DA_18_Rammus", 0, 1, 2)], bench: [B("DA_18_Warwick"), B("DA_18_KhaZix")], items: ["DA_Component_RecurveBow", "DA_Component_NegatronCloak"] },
    { s: "3-6", hp: 90, st: ["win", 3], shop: ["DA_18_Kobuko", "DA_18_Sejuani", "DA_18_Varus", "DA_18_Ornn", "DA_18_Xayah"] },
    { s: "3-7", hp: 90, st: ["win", 4], pve: { gold: 3, items: ["DA_Component_NeedlesslyLargeRod"] }, board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest", "DA_Component_GiantsBelt"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 2, ["DA_InfinityEdge", "DA_GuinsoosRageblade"]), U("DA_18_Varus", 3, 3), U("DA_18_Rammus", 0, 1, 2)], items: ["DA_Component_NegatronCloak"] },
    { s: "4-1", hp: 90, st: ["win", 5], shop: ["DA_18_KhaZix", "DA_18_Diana", "DA_18_Hecarim", "DA_18_Rengar", "DA_18_Shen"], buy: ["DA_18_KhaZix"], roll: 2, shopEnd: ["DA_18_KhaZix", "DA_18_Kayle", "DA_18_Elise", null, "DA_18_Tristana"], bench: [B("DA_18_Warwick"), B("DA_18_KhaZix"), B("DA_18_KhaZix")] },
    { s: "4-2", hp: 90, st: ["win", 6], shop: ["DA_18_KhaZix", "DA_18_Sett", "DA_18_Rammus", "DA_18_Varus", "DA_18_Ornn"], aug: { opts: ["DA_SpreadingRoots", "DA_TraitLadder", "DA_BirthdayReunion"], pick: "DA_TraitLadder" }, buy: ["DA_18_KhaZix"], roll: 4, shopEnd: ["DA_18_Hecarim", "DA_18_Caitlyn", "DA_18_Xayah", "DA_18_Kobuko", "DA_18_Yunara"], bench: [B("DA_18_Warwick"), B("DA_18_KhaZix"), B("DA_18_KhaZix"), B("DA_18_KhaZix")] },
    { s: "4-3", hp: 84, st: ["loss", 1], shop: ["DA_18_Warwick", "DA_18_Leona", "DA_18_Sejuani", "DA_18_Varus", "DA_18_Diana"], roll: 5, shopEnd: ["DA_18_Kobuko", "DA_18_Rammus", "DA_18_Shen", "DA_18_Xayah", "DA_18_Elise"], buy: ["DA_18_KhaZix", "DA_18_KhaZix", "DA_18_KhaZix"], board: [U("DA_18_Leona", 0, 3, 2, ["DA_Component_ChainVest", "DA_Component_GiantsBelt"]), U("DA_18_RekSai", 0, 2), U("DA_18_Warwick", 0, 4, 2), U("DA_18_KhaZix", 1, 5, 3, ["DA_InfinityEdge", "DA_GuinsoosRageblade"]), U("DA_18_Varus", 3, 3), U("DA_18_Rammus", 0, 1, 2)], bench: [B("DA_18_Warwick")] },
    { s: "4-5", hp: 84, st: ["win", 1], shop: ["DA_18_Sett", "DA_18_Lillia", "DA_18_Hecarim", "DA_18_Aphelios", "DA_18_Kayle"], buy: ["DA_18_Lillia"], bench: [B("DA_18_Warwick"), B("DA_18_Lillia")] },
  ],
};

// ── Game C: fast 9 that never got there; a 7th. One vision gap at 3-5 ──────
const gameC = {
  matchId: "fixture-fast-9-failed-rolldown",
  title: "Fast 9 without the board: a 7th",
  patch: "18.3",
  playerName: "Seat 7",
  finalPlacement: 7,
  notes: "Hand-built. Greedy econ with a weak board, a stage-3 roll that breaks 50, a rolldown to zero at level 7 on 4-2 that misses. Round 3-5's end state comes from perception with a misread gold value (confidence 0.4) to exercise the low-confidence path.",
  startGold: 11,
  startLevel: 3,
  startXp: { current: 6, needed: 10 },
  startBoard: [U("DA_18_Kobuko", 0, 4)],
  startItems: ["DA_Component_TearOfTheGoddess", "DA_Component_RecurveBow"],
  rounds: [
    { s: "2-1", hp: 100, st: ["win", 0], shop: ["DA_18_Kobuko", "DA_18_Xayah", "DA_18_Ornn", "DA_18_Varus", "DA_Karma18"], aug: { opts: AUG1, pick: "DA_BirthdayReunion" }, buy: ["DA_18_Xayah", "DA_18_Ornn"], board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Xayah", 3, 3)], bench: [], items: ["DA_Component_TearOfTheGoddess", "DA_Component_RecurveBow"] },
    { s: "2-2", hp: 94, st: ["loss", 1], shop: ["DA_18_Leona", "DA_18_Kayle", "DA_18_Varus", "DA_18_Elise", "DA_18_Sejuani"] },
    { s: "2-3", hp: 88, st: ["loss", 2], shop: ["DA_18_Kayle", "DA_18_Xayah", "DA_18_Caitlyn", "DA_18_Warwick", "DA_18_Yorick"], buy: ["DA_18_Kayle"], bench: [B("DA_18_Kayle")] },
    { s: "2-4", hp: 82, st: ["loss", 3], car: { id: "DA_18_Sejuani", item: "DA_Component_GiantsBelt" }, bench: [B("DA_18_Kayle"), B("DA_18_Sejuani")] },
    { s: "2-5", hp: 76, st: ["loss", 4], shop: ["DA_18_Shen", "DA_18_Kayle", "DA_18_Elise", "DA_18_Leona", "DA_18_Varus"], xp: 4, buy: ["DA_18_Kayle", "DA_18_Kayle"], board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Sejuani", 0, 2), U("DA_18_Xayah", 3, 3), U("DA_18_Kayle", 3, 4, 2)], bench: [], items: ["DA_Component_TearOfTheGoddess", "DA_Component_RecurveBow", "DA_Component_GiantsBelt"] },
    { s: "2-6", hp: 70, st: ["loss", 5], shop: ["DA_18_Yunara", "DA_18_Varus", "DA_18_Ornn", "DA_18_Warwick", "DA_18_Caitlyn"] },
    { s: "2-7", hp: 70, st: ["win", 1], pve: { gold: 2, items: ["DA_Component_ChainVest"] } },
    { s: "3-1", hp: 70, st: ["win", 2], shop: ["DA_18_Cassiopeia", "DA_18_Diana", "DA_18_Xayah", "DA_18_Elise", "DA_18_Shen"] },
    { s: "3-2", hp: 62, st: ["loss", 1], shop: ["DA_18_Hecarim", "DA_18_Leona", "DA_18_Kayle", "DA_18_Varus", "DA_18_Sejuani"], aug: { opts: ["DA_TraitLadder", "DA_SpreadingRoots", "DA_BirthdayReunion"], pick: "DA_SpreadingRoots" }, xp: 7, buy: ["DA_18_Sejuani", "DA_18_Leona"], board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Sejuani", 0, 2), U("DA_18_Xayah", 3, 3), U("DA_18_Kayle", 3, 4, 2), U("DA_18_Leona", 0, 1)], bench: [B("DA_18_Sejuani")], buy2: null },
    { s: "3-3", hp: 54, st: ["loss", 2], shop: ["DA_18_Aphelios", "DA_18_Rammus", "DA_18_Warwick", "DA_18_Tristana", "DA_18_Yunara"], roll: 6, shopEnd: ["DA_18_Kayle", "DA_18_Sejuani", "DA_18_Varus", "DA_18_Diana", "DA_18_Elise"], buy: ["DA_18_Kayle", "DA_18_Sejuani"], board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Sejuani", 0, 2, 2), U("DA_18_Xayah", 3, 3), U("DA_18_Kayle", 3, 4, 2), U("DA_18_Leona", 0, 1)], bench: [B("DA_18_Kayle")] },
    { s: "3-4", hp: 46, st: ["loss", 3], car: { id: "DA_18_Aphelios", item: "DA_Component_BFSword" }, bench: [B("DA_18_Kayle"), B("DA_18_Aphelios")] },
    { s: "3-5", hp: 46, st: ["win", 1], shop: ["DA_18_Shen", "DA_18_Diana", "DA_18_Xayah", "DA_18_Leona", "DA_18_Caitlyn"], board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Sejuani", 0, 2, 2, ["DA_SunfireCape"]), U("DA_18_Xayah", 3, 3), U("DA_18_Kayle", 3, 4, 2, ["DA_Component_RecurveBow"]), U("DA_18_Leona", 0, 1)], items: ["DA_Component_TearOfTheGoddess", "DA_Component_BFSword"], vision: { gold: 20, conf: 0.4 } },
    { s: "3-6", hp: 38, st: ["loss", 1], shop: ["DA_18_Varus", "DA_18_Hecarim", "DA_18_Elise", "DA_18_Ornn", "DA_18_Kobuko"] },
    { s: "3-7", hp: 38, st: ["win", 1], pve: { gold: 3, items: ["DA_Component_NeedlesslyLargeRod"] } },
    { s: "4-1", hp: 30, st: ["loss", 1], shop: ["DA_18_Rammus", "DA_18_Tristana", "DA_18_Warwick", "DA_18_Sett", "DA_18_Yunara"], xp: 9, board: [U("DA_18_Ornn", 0, 3), U("DA_18_Kobuko", 0, 4), U("DA_18_Sejuani", 0, 2, 2, ["DA_SunfireCape"]), U("DA_18_Xayah", 3, 3), U("DA_18_Kayle", 3, 4, 2, ["DA_GuinsoosRageblade"]), U("DA_18_Leona", 0, 1), U("DA_18_Aphelios", 3, 5, 1, ["DA_Component_BFSword"])], bench: [B("DA_18_Kayle")], items: ["DA_Component_TearOfTheGoddess"] },
    { s: "4-2", hp: 22, st: ["loss", 2], shop: ["DA_18_Malphite", "DA_18_Morgana", "DA_18_Hecarim", "DA_18_Varus", "DA_18_Diana"], aug: { opts: ["DA_BirthdayReunion", "DA_TraitLadder", "DA_SpreadingRoots"], pick: "DA_TraitLadder" }, roll: 6, buy: ["DA_18_Malphite", "DA_18_Morgana"], shopEnd: ["DA_18_Caitlyn", "DA_18_Sejuani", null, "DA_18_Warwick", null], bench: [B("DA_18_Kayle"), B("DA_18_Morgana"), B("DA_18_Malphite")], items: ["DA_Component_TearOfTheGoddess"], lobby: [{ playerName: "Seat 1", health: 88, level: 8 }, { playerName: "Seat 2", health: 90, level: 7 }, { playerName: "Seat 3", health: 61, level: 8 }, { playerName: "Seat 4", health: 47, level: 7 }, { playerName: "Seat 5", health: 76, level: 8 }, { playerName: "Seat 6", health: 12, level: 7 }, { playerName: "Seat 8", health: 55, level: 8 }] },
    { s: "4-3", hp: 14, st: ["loss", 3], shop: ["DA_18_Yunara", "DA_18_Leona", "DA_18_Xayah", "DA_18_Kobuko", "DA_18_Varus"], roll: 3, shopEnd: ["DA_18_Elise", "DA_18_Shen", "DA_18_Warwick", "DA_18_Caitlyn", "DA_18_Diana"] },
  ],
};

for (const g of [gameA, gameB, gameC]) {
  for (const r of g.rounds) delete r.buy2;
  const tl = build(g);
  const file = path.join(here, `${g.matchId}.json`);
  fs.writeFileSync(file, JSON.stringify(tl, null, 2) + "\n");
  const last = tl.rounds[tl.rounds.length - 1];
  console.log(`✓ ${g.matchId}: ${tl.rounds.length} states, ends ${last.stage} with ${last.gold} gold, level ${last.level}, ${last.health} HP`);
}
