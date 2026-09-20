/**
 * Category tags for augments and charms, derived from their text. Riot ships
 * no category field; these heuristics are shared by the set hub filters and
 * the team planner so the same augment always shows the same tags.
 */
export type Tag = "combat" | "econ" | "item" | "champion" | "shop" | "trait" | "utility";

export const TAGS: Tag[] = ["combat", "econ", "item", "champion", "shop", "trait", "utility"];

export const TAG_LABEL: Record<Tag, string> = {
  combat: "Combat",
  econ: "Gold",
  item: "Item",
  champion: "Champion",
  shop: "Shop",
  trait: "Trait",
  utility: "Utility",
};

/** CSS colour per tag (dark theme tokens). */
export const TAG_COLOR: Record<Tag, string> = {
  combat: "#e0483a",
  econ: "#ffb642",
  item: "#c440e0",
  champion: "#0ac8b9",
  shop: "#2f7fdc",
  trait: "#1bc47d",
  utility: "#a3b0bd",
};

const RE = {
  econ: /\bgold\b|\bxp\b|experience|interest|\bloan\b|income|\blevel up\b|levels? (?:up|gain)|free reroll|tactician health|player health|\bheal (?:you|the tactician)/i,
  champion: /(?:gain|get|receive|grants?|summon)[^.]{0,40}champion|copy of|copies|duplicator|team size/i,
  shop: /reroll|\bshop\b|\broll\b|\bstore\b/i,
  item: /\bitem|component|anvil|emblem|spatula|radiant|artifact|support item|remover|reforger|thief|tactician'?s (?:crown|cape|shield)/i,
  combat: /damage|health|attack|ability power|\bap\b|\bad\b|armor|magic resist|resist|shield|stun|heal(?!th)|mana|crit|omnivamp|durability|\bcombat\b|enemies|enemy|allies|your (?:units|champions|team)|attack speed|burn|wound|chill|sunder|shred|kill|takedown/i,
};

export function classifyTags(name: string, desc: string, associatedTraits: string[] = []): Tag[] {
  const text = `${name} ${desc}`;
  const out: Tag[] = [];
  if (associatedTraits.length > 0 || /\bcrest\b|\bcrown\b|\bemblem\b/i.test(name)) out.push("trait");
  if (RE.econ.test(text)) out.push("econ");
  if (RE.item.test(text)) out.push("item");
  if (RE.champion.test(text)) out.push("champion");
  if (RE.shop.test(text)) out.push("shop");
  if (RE.combat.test(text)) out.push("combat");
  if (out.length === 0) out.push("utility");
  // Keep the strongest signal first: trait > econ > item > shop > combat.
  return out.slice(0, 3);
}
