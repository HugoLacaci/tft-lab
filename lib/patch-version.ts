/**
 * Patch labels as Riot writes them: "18.3", "18.2b" (a b/c hotfix of 18.2).
 * Pure helpers, safe to import from client components.
 */
export interface PatchParts {
  set: number;
  minor: number;
  /** "" for the base patch, "b" / "c" for a mid-patch update */
  hotfix: string;
}

export function parsePatch(label: string | null | undefined): PatchParts | null {
  if (!label) return null;
  const m = label.trim().match(/^(\d+)\.(\d+)([a-z]?)$/i);
  if (!m) return null;
  return { set: Number(m[1]), minor: Number(m[2]), hotfix: (m[3] ?? "").toLowerCase() };
}

/** -1, 0, 1 like a comparator; unparsable labels compare as equal to everything. */
export function comparePatch(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parsePatch(a);
  const pb = parsePatch(b);
  if (!pa || !pb) return 0;
  if (pa.set !== pb.set) return pa.set < pb.set ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.hotfix !== pb.hotfix) return pa.hotfix < pb.hotfix ? -1 : 1;
  return 0;
}

/**
 * Curated content (comps, tiers) written for `curatedPatch` is stale once a
 * newer BASE patch is live. A b/c hotfix of the same patch does not count:
 * it is a balance tweak, the lines mostly survive it.
 */
export function isCuratedStale(curatedPatch: string | null | undefined, livePatch: string | null | undefined): boolean {
  const c = parsePatch(curatedPatch);
  const l = parsePatch(livePatch);
  if (!c || !l) return false;
  if (c.set !== l.set) return c.set < l.set;
  return c.minor < l.minor;
}
