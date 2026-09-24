/**
 * Site-wide search over public/search-index.json (scripts/build-search-index.ts).
 * Pure: no fs, no DOM, so the client palette and the tests share it.
 */
export type SearchKind = "comp" | "champion" | "trait" | "item" | "augment" | "wisp" | "guide" | "page";

export interface SearchRecord {
  k: SearchKind;
  n: string;
  h: string;
  s?: string;
  i?: string;
  c?: number;
  w?: string;
}

export const KIND_ORDER: SearchKind[] = ["comp", "champion", "trait", "item", "augment", "wisp", "guide", "page"];
export const KIND_LABEL: Record<SearchKind, string> = { comp: "Comps", champion: "Champions", trait: "Traits", item: "Items", augment: "Augments", wisp: "Wisps", guide: "Guides", page: "Pages" };

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreOne(rec: SearchRecord, tokens: string[]): number {
  const name = normalize(rec.n);
  const words = rec.w ? normalize(rec.w) : "";
  const sub = rec.s ? normalize(rec.s) : "";
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    if (name === t) best = 6;
    else if (name.startsWith(t)) best = 5;
    else if (name.split(" ").some((w) => w.startsWith(t))) best = 4;
    else if (name.includes(t)) best = 3;
    else if (words.split(" ").some((w) => w.startsWith(t))) best = 2;
    else if (words.includes(t) || sub.includes(t)) best = 1;
    if (best === 0) return 0; // every token must match somewhere
    total += best;
  }
  // shorter names win ties; kind order breaks the rest
  return total * 100 - Math.min(name.length, 60) - KIND_ORDER.indexOf(rec.k) * 0.1;
}

/** Ranked matches, every query token required. Empty query → nothing (the palette shows quick links instead). */
export function searchIndex(records: readonly SearchRecord[], query: string, limit = 40): SearchRecord[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  const scored: { r: SearchRecord; s: number }[] = [];
  for (const r of records) {
    const s = scoreOne(r, tokens);
    if (s > 0) scored.push({ r, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.r);
}

/** Results grouped in KIND_ORDER, keeping rank inside each group. */
export function groupResults(results: readonly SearchRecord[]): { kind: SearchKind; items: SearchRecord[] }[] {
  const by = new Map<SearchKind, SearchRecord[]>();
  for (const r of results) {
    const list = by.get(r.k) ?? [];
    list.push(r);
    by.set(r.k, list);
  }
  return KIND_ORDER.filter((k) => by.has(k)).map((k) => ({ kind: k, items: by.get(k)! }));
}
