import type { Comp, CompsFile } from "./comps";

// Pure module: it is bundled into the client (CompList), so no node:fs here;
// the loader lives in comps-changes-server.ts. Mirrors TIER_ORDER in lib/comps.ts.
const TIER_ORDER: Record<Comp["tier"], number> = { S: 0, A: 1, B: 2, C: 3, X: 4 };

/**
 * What changed in the curated comps since the previous patch.
 *
 * `scripts/sync-comps.ts` keeps two snapshots in data/generated/comps-history.json:
 * `baseline` (the comps as they were on the previous patch label) and `latest`
 * (the last version it saw). When comps.json moves to a new patch label the
 * old `latest` becomes the `baseline`, so the diff always reads "since the
 * last patch". The diff itself is written to data/generated/comps-changes.json
 * and rendered as badges on /set/comps: new, tier up, tier down, adjusted.
 */
export type ChangeKind = "new" | "up" | "down" | "adjusted";

export interface CompChange {
  kind: ChangeKind;
  /** Previous tier for up/down. */
  from?: Comp["tier"];
  to?: Comp["tier"];
  /** Human-readable list of what moved (board, items, augments, notes…). */
  details: string[];
}

export interface CompsChangesFile {
  computedAt: string;
  /** Patch label the changes are measured against; null when there is no baseline yet. */
  since: string | null;
  sinceVerifiedOn: string | null;
  patch: string;
  verifiedOn: string;
  changes: Record<string, CompChange>;
  removed: { id: string; name: string; tier: Comp["tier"] }[];
}

export interface CompsHistoryFile {
  /** Set the snapshots belong to; a history from another set is discarded. */
  set?: number;
  baseline: CompsFile | null;
  latest: CompsFile | null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function boardUnits(c: Comp): Map<string, { row: number; col: number; star: number; items: string[] }[]> {
  const m = new Map<string, { row: number; col: number; star: number; items: string[] }[]>();
  for (const [id, row, col, star, items] of c.board) {
    const arr = m.get(id) ?? [];
    arr.push({ row, col, star, items: [...items].sort() });
    m.set(id, arr);
  }
  return m;
}

/** Diff one comp against its previous version. Names come from `names` (unit/item/augment id → display name). */
export function diffComp(prev: Comp, next: Comp, names: Record<string, string> = {}): CompChange | null {
  const n = (id: string) => names[id] ?? id;
  const details: string[] = [];
  const pu = boardUnits(prev);
  const nu = boardUnits(next);
  const added = [...nu.keys()].filter((id) => !pu.has(id));
  const removed = [...pu.keys()].filter((id) => !nu.has(id));
  if (added.length || removed.length) details.push(`Board: ${[...added.map((id) => `+${n(id)}`), ...removed.map((id) => `−${n(id)}`)].join(", ")}`);
  const moved = [...nu.keys()].filter((id) => pu.has(id) && !same(pu.get(id)!.map((u) => [u.row, u.col]), nu.get(id)!.map((u) => [u.row, u.col])));
  if (moved.length) details.push(`Repositioned: ${moved.map(n).join(", ")}`);
  const restarred = [...nu.keys()].filter((id) => pu.has(id) && !same(pu.get(id)!.map((u) => u.star), nu.get(id)!.map((u) => u.star)));
  if (restarred.length) details.push(`Star level: ${restarred.map(n).join(", ")}`);
  const prevCarries = new Map(prev.carries.map((c) => [c.championId, [...c.items].sort()]));
  for (const c of next.carries) {
    const before = prevCarries.get(c.championId);
    const after = [...c.items].sort();
    if (!before) details.push(`New carry: ${n(c.championId)}`);
    else if (!same(before, after)) details.push(`Items on ${n(c.championId)}: ${before.map(n).join(" + ") || "none"} → ${after.map(n).join(" + ") || "none"}`);
  }
  for (const c of prev.carries) if (!next.carries.some((x) => x.championId === c.championId)) details.push(`No longer a carry: ${n(c.championId)}`);
  const pa = prev.augments.map((a) => a.augmentId).sort();
  const na = next.augments.map((a) => a.augmentId).sort();
  if (!same(pa, na)) {
    const plus = na.filter((a) => !pa.includes(a)).map(n);
    const minus = pa.filter((a) => !na.includes(a)).map(n);
    details.push(`Augments: ${[...plus.map((x) => `+${x}`), ...minus.map((x) => `−${x}`)].join(", ")}`);
  }
  if (prev.style !== next.style) details.push(`Style: ${prev.style} → ${next.style}`);
  const flexIds = (c: Comp) => [...c.flex, ...c.extra].map((r) => r.championId).sort();
  if (!same(flexIds(prev), flexIds(next))) details.push("Flex / late-game units updated");
  if (prev.summary !== next.summary || !same(prev.howToPlay, next.howToPlay) || prev.positioning !== next.positioning || !same(prev.stages, next.stages)) details.push("Guide text updated");

  if (prev.tier !== next.tier) {
    const kind: ChangeKind = TIER_ORDER[next.tier] < TIER_ORDER[prev.tier] ? "up" : "down";
    return { kind, from: prev.tier, to: next.tier, details };
  }
  if (details.length === 0) return null;
  return { kind: "adjusted", details };
}

export function diffComps(baseline: CompsFile | null, current: CompsFile, names: Record<string, string> = {}, now = new Date()): CompsChangesFile {
  const changes: Record<string, CompChange> = {};
  const removed: CompsChangesFile["removed"] = [];
  if (baseline) {
    const prevById = new Map(baseline.comps.map((c) => [c.id, c]));
    for (const c of current.comps) {
      const prev = prevById.get(c.id);
      if (!prev) {
        changes[c.id] = { kind: "new", details: [] };
        continue;
      }
      const d = diffComp(prev, c, names);
      if (d) changes[c.id] = d;
    }
    for (const c of baseline.comps) if (!current.comps.some((x) => x.id === c.id)) removed.push({ id: c.id, name: c.name, tier: c.tier });
  }
  return {
    computedAt: now.toISOString(),
    since: baseline?.patch ?? null,
    sinceVerifiedOn: baseline?.verifiedOn ?? null,
    patch: current.patch,
    verifiedOn: current.verifiedOn,
    changes,
    removed,
  };
}

/**
 * Roll the history forward: a new patch label promotes the last seen version
 * to the baseline. Returns the next history and the changes to publish.
 */
export function advanceHistory(history: CompsHistoryFile, current: CompsFile, names: Record<string, string> = {}, now = new Date()): { history: CompsHistoryFile; changes: CompsChangesFile } {
  let baseline = history.baseline;
  if (history.latest && history.latest.patch !== current.patch) baseline = history.latest;
  if (!baseline && !history.latest) baseline = null;
  const next: CompsHistoryFile = { baseline, latest: current };
  return { history: next, changes: diffComps(baseline, current, names, now) };
}

export function changeCounts(changes: CompsChangesFile | null): Record<ChangeKind, number> {
  const out: Record<ChangeKind, number> = { new: 0, up: 0, down: 0, adjusted: 0 };
  for (const c of Object.values(changes?.changes ?? {})) out[c.kind]++;
  return out;
}

/** A short string that changes whenever the published changes change; the "seen" marker for the NEW dot. */
export function compsChangesStamp(changes: CompsChangesFile | null): string | null {
  if (!changes || Object.keys(changes.changes).length === 0) return null;
  const counts = changeCounts(changes);
  return `${changes.patch}|${changes.verifiedOn}|${counts.new}/${counts.up}/${counts.down}/${counts.adjusted}|${Object.keys(changes.changes).sort().join(",")}`;
}
