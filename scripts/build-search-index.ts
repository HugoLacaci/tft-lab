/**
 * npm run build-search
 *
 * Writes public/search-index.json: one compact record per champion, trait,
 * item, augment, wisp, comp, guide and page, for the site-wide search
 * (components/layout/SearchPalette.tsx, opened with Ctrl/⌘ K). Fetched lazily
 * by the browser the first time the palette opens, so it costs nothing on
 * pages where nobody searches. Runs in `npm run build` and `npm run dev`;
 * the output is gitignored.
 */
import fs from "node:fs";
import path from "node:path";
import { loadSetData } from "../lib/set-data";
import { loadComps } from "../lib/comps";
import { guideSlugs, readGuide } from "../lib/guide-sections";
import { SCENARIO_CATEGORIES, CATEGORY_LABELS } from "../lib/scenario-categories";
import { RANK_TIERS } from "../lib/rank-tiers";

export type SearchKind = "comp" | "champion" | "trait" | "item" | "augment" | "wisp" | "guide" | "page";

export interface SearchRecord {
  /** grouping + icon frame */
  k: SearchKind;
  /** display name */
  n: string;
  /** route (with basePath added by the client) */
  h: string;
  /** subtitle: cost, tier, traits, kind… */
  s?: string;
  /** icon path under /assets, when there is art */
  i?: string;
  /** cost 1..5 (champions) so the client can colour the frame */
  c?: number;
  /** extra searchable words (trait names on a champion, unit names on a comp) */
  w?: string;
}

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "search-index.json");

function build(): SearchRecord[] {
  const out: SearchRecord[] = [];
  const set = loadSetData();
  const traitName = new Map(set?.traits.map((t) => [t.id, t.name]) ?? []);
  const unitName = new Map(set?.champions.map((c) => [c.id, c.name]) ?? []);

  const comps = loadComps();
  if (comps) {
    for (const c of comps.comps) {
      const units = [...new Set(c.board.map((u) => unitName.get(u[0]) ?? u[0]))];
      out.push({ k: "comp", n: c.name, h: `/set/comps/#comp-${c.id}`, s: `${c.tier} tier · ${c.style}`, w: units.join(" ") });
    }
  }
  if (set) {
    for (const c of set.champions) {
      const traits = c.traits.map((t) => traitName.get(t) ?? t);
      out.push({ k: "champion", n: c.name, h: `/set/champions/${c.id}/`, s: `${c.cost}-cost · ${traits.join(", ")}`, i: c.icon, c: c.cost, w: traits.join(" ") });
    }
    for (const t of set.traits) {
      const n = set.champions.filter((c) => c.traits.includes(t.id)).length;
      out.push({ k: "trait", n: t.name, h: `/set/traits/#${t.id}`, s: `${n} champions`, i: t.icon });
    }
    for (const i of set.items) {
      if (i.kind === "other") continue;
      if (i.kind === "charm") {
        if (/_Upgrade$/i.test(i.id)) continue;
        out.push({ k: "wisp", n: i.name, h: `/set/wisps/#${i.id}`, s: "Wisp", i: i.icon });
        continue;
      }
      out.push({ k: "item", n: i.name, h: `/set/items/#${i.id}`, s: i.kind, i: i.icon });
    }
    for (const a of set.augments) out.push({ k: "augment", n: a.name, h: `/set/augments/#${a.id}`, s: `${a.tier} augment`, i: a.icon });
  }
  for (const slug of guideSlugs()) {
    const g = readGuide(slug);
    if (g) out.push({ k: "guide", n: String(g.data.title ?? slug), h: `/guides/${slug}/`, s: "Guide" });
  }
  const pages: [string, string, string][] = [
    ["Comps tier list", "/set/comps/", "Current patch"],
    ["Patch notes", "/set/patch-notes/", "Riot's notes, mirrored"],
    ["Set hub", "/set/", "Champions, traits, items, augments"],
    ["Champions", "/set/champions/", "Roster"],
    ["Traits", "/set/traits/", "Breakpoints"],
    ["Items", "/set/items/", "Recipes and tiers"],
    ["Augments", "/set/augments/", "Tiers"],
    ["Wisps", "/set/wisps/", "Set mechanic"],
    ["Trainer", "/trainer/", "Decision drills"],
    ["Daily 10", "/trainer/daily/", "Today's drills"],
    ["Puzzles", "/trainer/puzzles/", "Ladder by rank"],
    ["Team planner", "/lab/board/", "Build and simulate a board"],
    ["Roll odds", "/lab/odds/", "Calculator"],
    ["Econ simulator", "/lab/econ/", "Interest and streaks"],
    ["Cheat sheet", "/lab/cheatsheet/", "Printable"],
    ["Routine", "/routine/", "Practice plan"],
    ["Tracker", "/tracker/", "Match history and leaks"],
    ["Compete", "/compete/", "Circuit and creators"],
    ["Resources", "/resources/", "Where to go for what"],
  ];
  for (const [n, h, s] of pages) out.push({ k: "page", n, h, s });
  for (const c of SCENARIO_CATEGORIES) out.push({ k: "page", n: `${CATEGORY_LABELS[c]} drills`, h: `/trainer/${c}/`, s: "Trainer" });
  for (const t of RANK_TIERS) out.push({ k: "page", n: `${t.label} puzzles`, h: `/trainer/puzzles/${t.id}/`, s: "Puzzle ladder" });
  return out;
}

const records = build();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(records));
console.log(`✓ wrote public/search-index.json: ${records.length} records (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
