import { renderMdx } from "./mdx";
import { extractSection, parseGuideLink, readGuide } from "./guide-sections";
import type { Scenario } from "./scenario-schema";
import { itemLookup, traitLookup, unitLookup, loadSetData } from "./set-data";
import { GENERIC_ITEMS, GENERIC_UNITS } from "@/data/archetypes";
import { GENERIC_AUGMENTS } from "@/data/generic-augments";
import { getConstants } from "@/data/constants";
import type { Rendered, SessionData } from "./trainer-props";

/** Everything a Session needs, built at build time on the server. */
export async function buildSessionData(scenarios: Scenario[]): Promise<{ data: SessionData; rendered: Record<string, Rendered> }> {
  const set = loadSetData();
  const augments: SessionData["augments"] = {};
  for (const a of Object.values(GENERIC_AUGMENTS)) augments[a.id] = { id: a.id, name: a.name, tier: a.tier, desc: a.desc, icon: `/assets/generic/${a.kind === "trait" ? "support" : a.kind === "econ" ? "carry" : a.kind === "item" ? "tank" : "caster"}.svg` };
  for (const a of set?.augments ?? []) augments[a.id] = { id: a.id, name: a.name, tier: a.tier, desc: a.desc, icon: a.icon };
  // keep only referenced augments to keep the payload small
  const used = new Set(scenarios.flatMap((s) => (s.question.type === "augment" ? s.question.options : [])));
  for (const k of Object.keys(augments)) if (!used.has(k)) delete augments[k];

  const unitIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const s of scenarios) {
    for (const u of [...s.state.board, ...s.state.bench, ...(s.state.enemyBoard ?? [])]) {
      unitIds.add(u.championId);
      for (const i of u.items) itemIds.add(i);
    }
    for (const id of s.state.shop) if (id) unitIds.add(id);
    for (const i of s.state.items) itemIds.add(i);
    if (s.question.type === "placement") unitIds.add(s.question.unitId);
    if (s.question.type === "item-holder") itemIds.add(s.question.itemId);
  }
  const allUnits = { ...GENERIC_UNITS, ...unitLookup() };
  const allItems = { ...GENERIC_ITEMS, ...itemLookup() };
  const units = Object.fromEntries([...unitIds].filter((id) => allUnits[id]).map((id) => [id, allUnits[id]!]));
  const items = Object.fromEntries([...itemIds].filter((id) => allItems[id]).map((id) => [id, allItems[id]!]));
  const traitNames = Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name]));
  const k = getConstants();
  const xpNeeded = Object.fromEntries(k.xpToLevel.map((r) => [r.level - 1, r.xp]));

  const rendered: Record<string, Rendered> = {};
  for (const s of scenarios) {
    const explanation = (await renderMdx(s.explanation)).content;
    let explainMore: Rendered["explainMore"] = null;
    const gl = parseGuideLink(s.guideLink);
    if (gl) {
      const g = readGuide(gl.slug);
      const section = g ? extractSection(g.content, gl.anchor) : null;
      if (section) explainMore = (await renderMdx(section)).content;
    }
    rendered[s.id] = { explanation, explainMore };
  }
  return { data: { scenarios, units, items, traitNames, augments, xpNeeded }, rendered };
}
