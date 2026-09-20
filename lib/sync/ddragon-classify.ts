import type { ItemKind } from "../types";

const COMPONENT_NAMES = new Set([
  "b.f. sword",
  "chain vest",
  "frying pan",
  "giant's belt",
  "needlessly large rod",
  "negatron cloak",
  "recurve bow",
  "sparring gloves",
  "spatula",
  "tear of the goddess",
]);

/** DDragon has no tags; classify by id/name conventions only. */
export function classifyDdItem(id: string, name: string): ItemKind {
  if (COMPONENT_NAMES.has(name.toLowerCase())) return "component";
  if (/Emblem/i.test(id) || /\bEmblem$/i.test(name)) return "emblem";
  if (/Radiant/i.test(id) || /^Radiant /i.test(name)) return "radiant";
  if (/Artifact|_Ornn/i.test(id)) return "artifact";
  if (/Support/i.test(id)) return "support";
  if (/^TFT_Item_/.test(id)) return "completed";
  return "other";
}
