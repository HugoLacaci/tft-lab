import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ScenarioSchema } from "./scenario-schema";
import { scenarioFiles } from "./scenarios";
import { extractSection, guideSlugs, headings, parseGuideLink, readGuide } from "./guide-sections";
import { GENERIC_UNITS, GENERIC_ITEMS } from "@/data/archetypes";
import { GENERIC_AUGMENTS } from "@/data/generic-augments";
import type { SetData } from "./types";
import { CompsFileSchema } from "./comps";

export interface Problem {
  file: string;
  field?: string;
  message: string;
}

const CurrentSchema = z.object({
  setNumber: z.number().int().nonnegative(),
  setName: z.string(),
  mutator: z.string(),
  syncedAt: z.string(),
  patch: z.string(),
});

export function validateCurrent(root = process.cwd()): Problem[] {
  const file = path.join(root, "data", "generated", "current.json");
  if (!fs.existsSync(file)) return [{ file: "data/generated/current.json", message: "missing" }];
  const parsed = CurrentSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({ file: "data/generated/current.json", field: i.path.join("."), message: i.message }));
  }
  return [];
}

function loadSet(root: string): { number: number; data: SetData | null } {
  const cur = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "current.json"), "utf8")) as { setNumber: number };
  const f = path.join(root, "data", "generated", `set-${cur.setNumber}.json`);
  return { number: cur.setNumber, data: fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as SetData) : null };
}

/** Every scenario parses, references known ids, and links to a real guide anchor. */
export function validateScenarios(root = process.cwd()): Problem[] {
  const problems: Problem[] = [];
  const { number: liveSet, data } = loadSet(root);
  const setUnits = new Set(data?.champions.map((c) => c.id) ?? []);
  const setItems = new Set(data?.items.map((i) => i.id) ?? []);
  const setAugs = new Set(data?.augments.map((a) => a.id) ?? []);
  const ids = new Set<string>();
  const perCategory = new Map<string, number>();

  for (const file of scenarioFiles(root)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      problems.push({ file: rel, message: `invalid JSON: ${e instanceof Error ? e.message : e}` });
      continue;
    }
    const parsed = ScenarioSchema.safeParse(json);
    if (!parsed.success) {
      for (const i of parsed.error.issues) problems.push({ file: rel, field: i.path.join("."), message: i.message });
      continue;
    }
    const s = parsed.data;
    if (ids.has(s.id)) problems.push({ file: rel, field: "id", message: `duplicate id "${s.id}"` });
    ids.add(s.id);
    const expectedCat = path.basename(path.dirname(file));
    if (expectedCat !== s.category) problems.push({ file: rel, field: "category", message: `folder is "${expectedCat}" but category is "${s.category}"` });
    perCategory.set(s.category, (perCategory.get(s.category) ?? 0) + 1);

    // Only check ids against set data when the scenario targets the live set;
    // a stale set-specific scenario is simply filtered out at runtime.
    const live = s.setAgnostic || s.set === liveSet;
    const unitOk = (id: string) => id in GENERIC_UNITS || (live && setUnits.has(id)) || (!live && !s.setAgnostic);
    const itemOk = (id: string) => id in GENERIC_ITEMS || (live && setItems.has(id)) || (!live && !s.setAgnostic);
    const augOk = (id: string) => id in GENERIC_AUGMENTS || (live && setAugs.has(id)) || (!live && !s.setAgnostic);

    if (s.setAgnostic) {
      const nonGeneric = [...s.state.board, ...s.state.bench, ...(s.state.enemyBoard ?? [])].map((u) => u.championId).filter((id) => !(id in GENERIC_UNITS));
      if (nonGeneric.length) problems.push({ file: rel, field: "state", message: `setAgnostic scenario uses set-specific unit ids: ${[...new Set(nonGeneric)].join(", ")}` });
    }
    s.state.board.forEach((u, i) => {
      if (!unitOk(u.championId)) problems.push({ file: rel, field: `state.board.${i}.championId`, message: `unknown unit "${u.championId}"` });
      u.items.forEach((it, j) => {
        if (!itemOk(it)) problems.push({ file: rel, field: `state.board.${i}.items.${j}`, message: `unknown item "${it}"` });
      });
    });
    s.state.bench.forEach((u, i) => {
      if (!unitOk(u.championId)) problems.push({ file: rel, field: `state.bench.${i}.championId`, message: `unknown unit "${u.championId}"` });
    });
    (s.state.enemyBoard ?? []).forEach((u, i) => {
      if (!unitOk(u.championId)) problems.push({ file: rel, field: `state.enemyBoard.${i}.championId`, message: `unknown unit "${u.championId}"` });
    });
    s.state.shop.forEach((id, i) => {
      if (id && !unitOk(id)) problems.push({ file: rel, field: `state.shop.${i}`, message: `unknown unit "${id}"` });
    });
    s.state.items.forEach((id, i) => {
      if (!itemOk(id)) problems.push({ file: rel, field: `state.items.${i}`, message: `unknown item "${id}"` });
    });
    if (s.question.type === "placement" && !unitOk(s.question.unitId)) problems.push({ file: rel, field: "question.unitId", message: `unknown unit "${s.question.unitId}"` });
    if (s.question.type === "augment") {
      s.question.options.forEach((id, i) => {
        if (!augOk(id)) problems.push({ file: rel, field: `question.options.${i}`, message: `unknown augment "${id}"` });
      });
    }
    if (s.question.type === "item-holder") {
      if (!itemOk(s.question.itemId)) problems.push({ file: rel, field: "question.itemId", message: `unknown item "${s.question.itemId}"` });
      const onBoard = new Set(s.state.board.map((u) => u.championId));
      s.question.correctUnitIds.forEach((id, i) => {
        if (!onBoard.has(id)) problems.push({ file: rel, field: `question.correctUnitIds.${i}`, message: `"${id}" is not on the board` });
      });
    }

    // guideLink must resolve to an existing guide + anchor
    const gl = parseGuideLink(s.guideLink);
    if (!gl) problems.push({ file: rel, field: "guideLink", message: `malformed "${s.guideLink}"` });
    else {
      const g = readGuide(gl.slug, path.join(root, "content", "guides"));
      if (!g) problems.push({ file: rel, field: "guideLink", message: `guide "${gl.slug}" does not exist` });
      else if (gl.anchor && extractSection(g.content, gl.anchor) === null)
        problems.push({ file: rel, field: "guideLink", message: `anchor #${gl.anchor} not found in ${gl.slug}.mdx (headings: ${headings(g.content).map((h) => h.slug).join(", ")})` });
    }
  }
  return problems;
}

/**
 * Internal links inside guide MDX files must resolve: /guides/<slug>#anchor,
 * /trainer/<category>, /set..., /lab..., and the fixed top-level routes.
 */
export function validateGuideLinks(root = process.cwd()): Problem[] {
  const problems: Problem[] = [];
  const guides = guideSlugs(path.join(root, "content", "guides"));
  const routes = new Set([
    "/",
    "/guides",
    "/set",
    "/set/champions",
    "/set/traits",
    "/set/items",
    "/set/augments",
    "/trainer",
    "/trainer/daily",
    "/lab",
    "/lab/odds",
    "/lab/econ",
    "/lab/cheatsheet",
    "/lab/board",
    "/routine",
    "/tracker",
    "/compete",
    "/resources",
  ]);
  for (const c of ["econ", "level-timing", "augment", "items", "positioning", "pivot", "carousel", "scouting", "hp-management", "endgame"]) routes.add(`/trainer/${c}`);
  for (const g of guides) routes.add(`/guides/${g}`);

  for (const slug of guides) {
    const g = readGuide(slug, path.join(root, "content", "guides"))!;
    const rel = `content/guides/${slug}.mdx`;
    const re = /\]\((\/[^)\s]*)\)|href="(\/[^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(g.content)) !== null) {
      const href = (m[1] ?? m[2])!;
      const [p, anchor] = href.split("#");
      const clean = p!.replace(/\/$/, "") || "/";
      if (!routes.has(clean)) {
        problems.push({ file: rel, message: `dead internal link ${href}` });
        continue;
      }
      if (anchor && clean.startsWith("/guides/")) {
        const target = readGuide(clean.slice("/guides/".length), path.join(root, "content", "guides"));
        if (target && extractSection(target.content, anchor) === null) problems.push({ file: rel, message: `dead anchor ${href}` });
      }
    }
    for (const key of ["title"]) if (!g.data[key]) problems.push({ file: rel, field: `frontmatter.${key}`, message: "required" });
  }
  return problems;
}

/**
 * Hardcoded set numbers are only allowed in content/sets/, data/generated/,
 * data/constants/set-<n>.ts, docs/ and tests/fixtures. Everything else must
 * derive from current.json.
 */
export function validateNoHardcodedSet(root = process.cwd()): Problem[] {
  const problems: Problem[] = [];
  // content/scenarios is excluded: setAgnostic:false scenarios legitimately carry set ids and are filtered at runtime.
  const scan = ["app", "components", "lib", "content/guides", "data/constants/index.ts", "data/archetypes.ts", "data/generic-augments.ts", "data/creators.ts", "data/constants/circuit.ts", "scripts"];
  const re = /\b(?:Set|set)[ _-]?(1[0-9]|[2-9][0-9])\b|\bTFT(?:Set)?(1[0-9])_|\bDA_(1[0-9])_|set-(1[0-9])\.json/g;
  const walk = (p: string) => {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const f of fs.readdirSync(abs)) walk(path.join(p, f));
      return;
    }
    if (!/\.(tsx?|mdx?|json|mjs)$/.test(abs)) return;
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      re.lastIndex = 0;
      const trimmed = line.trim();
      const isComment = /^(\/\/|\*|\/\*|<!--|#)/.test(trimmed);
      if (!isComment && re.test(line) && !/set-nocheck/.test(line)) problems.push({ file: `${p.replace(/\\/g, "/")}:${i + 1}`, message: `hardcoded set reference: ${line.trim().slice(0, 100)}` });
    });
  };
  for (const p of scan) walk(p);
  return problems;
}

/** Every MDX file under content/ must at least parse (catches HTML comments, bad JSX). */
export async function validateMdxSyntax(root = process.cwd()): Promise<Problem[]> {
  const { compile } = await import("@mdx-js/mdx");
  const problems: Problem[] = [];
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".mdx")) files.push(p);
    }
  };
  walk(path.join(root, "content"));
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const src = fs.readFileSync(file, "utf8").replace(/^---[\s\S]*?\n---\n/, "");
    try {
      await compile(src, { outputFormat: "function-body" });
    } catch (e) {
      problems.push({ file: rel, message: `MDX does not compile: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return problems;
}

export async function runValidation(root = process.cwd()): Promise<Problem[]> {
  return [...validateCurrent(root), ...validateScenarios(root), ...validateGuideLinks(root), ...validateNoHardcodedSet(root), ...validateCurated(root), ...(await validateMdxSyntax(root))];
}

/**
 * Curated per-set content (comps, tiers, wisp costs) must reference real ids
 * and names from the synced set, so a typo or a set change fails the build.
 */
export function validateCurated(root = process.cwd()): Problem[] {
  const problems: Problem[] = [];
  const { number: liveSet, data } = loadSet(root);
  if (!data) return problems;
  const dir = path.join(root, "content", "sets", String(liveSet));
  const champs = new Set(data.champions.map((c) => c.id));
  const items = new Set(data.items.map((i) => i.id));
  const augs = new Set(data.augments.map((a) => a.id));
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+]/g, "");
  const itemNames = new Set(data.items.map((i) => norm(i.name)));
  const augNames = new Set(data.augments.map((a) => norm(a.name)));
  const wispNames = new Set(data.items.filter((i) => i.kind === "charm").map((i) => norm(i.name)));

  const compsFile = path.join(dir, "comps.json");
  if (fs.existsSync(compsFile)) {
    const rel = `content/sets/${liveSet}/comps.json`;
    const parsed = CompsFileSchema.safeParse(JSON.parse(fs.readFileSync(compsFile, "utf8")));
    if (!parsed.success) {
      for (const i of parsed.error.issues) problems.push({ file: rel, field: i.path.join("."), message: i.message });
    } else {
      const ids = new Set<string>();
      parsed.data.comps.forEach((c, ci) => {
        if (ids.has(c.id)) problems.push({ file: rel, field: `comps[${ci}].id`, message: `duplicate comp id "${c.id}"` });
        ids.add(c.id);
        c.board.forEach((u, ui) => {
          if (!champs.has(u[0])) problems.push({ file: rel, field: `comps[${ci}].board[${ui}]`, message: `unknown champion id "${u[0]}"` });
          for (const it of u[4]) if (!items.has(it)) problems.push({ file: rel, field: `comps[${ci}].board[${ui}]`, message: `unknown item id "${it}"` });
        });
        for (const x of [...c.carries, ...c.flex, ...c.extra]) if (!champs.has(x.championId)) problems.push({ file: rel, field: `comps[${ci}]`, message: `unknown champion id "${x.championId}"` });
        for (const x of c.carries) for (const it of x.items) if (!items.has(it)) problems.push({ file: rel, field: `comps[${ci}].carries`, message: `unknown item id "${it}"` });
        for (const a of c.augments) if (!augs.has(a.augmentId)) problems.push({ file: rel, field: `comps[${ci}].augments`, message: `unknown augment id "${a.augmentId}"` });
      });
    }
  }

  const tiersFile = path.join(dir, "tiers.json");
  if (fs.existsSync(tiersFile)) {
    const rel = `content/sets/${liveSet}/tiers.json`;
    const t = JSON.parse(fs.readFileSync(tiersFile, "utf8")) as { items?: Record<string, string>; augments?: Record<string, string> };
    for (const [name, rank] of Object.entries(t.items ?? {})) {
      if (!/^[SABCDF]$/.test(rank)) problems.push({ file: rel, field: `items.${name}`, message: `rank must be S–F, got "${rank}"` });
      if (!itemNames.has(norm(name))) problems.push({ file: rel, field: `items.${name}`, message: "no item with that name in the synced set" });
    }
    for (const [name, rank] of Object.entries((t as { wisps?: Record<string, string> }).wisps ?? {})) {
      if (!/^[SABCDF]$/.test(rank)) problems.push({ file: rel, field: `wisps.${name}`, message: `rank must be S–F, got "${rank}"` });
      if (!wispNames.has(norm(name))) problems.push({ file: rel, field: `wisps.${name}`, message: "no wisp with that name in the synced set" });
    }
    for (const [name, rank] of Object.entries(t.augments ?? {})) {
      if (!/^[SABCDF]$/.test(rank)) problems.push({ file: rel, field: `augments.${name}`, message: `rank must be S–F, got "${rank}"` });
      if (!augNames.has(norm(name))) problems.push({ file: rel, field: `augments.${name}`, message: "no augment with that name in the synced set" });
    }
  }

  const wispsFile = path.join(dir, "wisps.json");
  if (fs.existsSync(wispsFile)) {
    const rel = `content/sets/${liveSet}/wisps.json`;
    const w = JSON.parse(fs.readFileSync(wispsFile, "utf8")) as { costs?: Record<string, number> };
    for (const [name, cost] of Object.entries(w.costs ?? {})) {
      if (typeof cost !== "number" || cost < 0) problems.push({ file: rel, field: `costs.${name}`, message: "cost must be a non-negative number" });
      if (!wispNames.has(norm(name))) problems.push({ file: rel, field: `costs.${name}`, message: "no wisp with that name in the synced set" });
    }
  }
  return problems;
}
