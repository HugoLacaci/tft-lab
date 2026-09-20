import fs from "node:fs";
import path from "node:path";

/**
 * Human-authored per-set metadata: content/sets/<n>/meta.json.
 * Optional. Only used to override a placeholder set name coming from upstream
 * (CDragon reported "Set10" for Set 18 on 2026-09-20) and to hold a tagline.
 */
export interface SetContentMeta {
  displayName?: string;
  tagline?: string;
}

const cache = new Map<number, SetContentMeta | null>();

export function readSetContentMeta(setNumber: number): SetContentMeta | null {
  if (cache.has(setNumber)) return cache.get(setNumber) ?? null;
  try {
    const file = path.join(process.cwd(), "content", "sets", String(setNumber), "meta.json");
    if (!fs.existsSync(file)) {
      cache.set(setNumber, null);
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SetContentMeta;
    cache.set(setNumber, parsed);
    return parsed;
  } catch {
    cache.set(setNumber, null);
    return null;
  }
}

/** Upstream names like "Set10" / "Set18" are placeholders, not real names. */
export function isPlaceholderName(name: string): boolean {
  return /^set\s*\d+$/i.test(name.trim()) || name.trim() === "";
}

export function setDisplayName(setNumber: number, upstreamName: string): string {
  const meta = readSetContentMeta(setNumber);
  if (meta?.displayName) return meta.displayName;
  if (isPlaceholderName(upstreamName)) return `Set ${setNumber}`;
  return upstreamName;
}

/** True when a human has written prose for this set (content/sets/<n>/ exists). */
export function hasSetContent(setNumber: number): boolean {
  try {
    const dir = path.join(process.cwd(), "content", "sets", String(setNumber));
    return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".mdx"));
  } catch {
    return false;
  }
}
