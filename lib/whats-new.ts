"use client";

import { useEffect, useState } from "react";
import { readJson, writeJson } from "./storage";

/**
 * "Something changed since you last looked" markers, kept in this browser
 * (localStorage `tftlab.seen.v1`). Each area has a stamp computed at build
 * time from the generated data; when the stamp differs from the stored one
 * the NEW dot shows until the page is opened and `markSeen` runs.
 *
 * A first-time visitor has nothing stored: patch notes count as new when the
 * latest note is under two weeks old, comps when there are published changes.
 */
export type NewsArea = "patch-notes" | "comps";

export interface NewsStamps {
  /** slug of the newest patch note, or null when not synced */
  patchNotes: string | null;
  /** ISO date of the newest patch note */
  patchNotesAt: string | null;
  /** stamp of the published comps changes, or null when there are none */
  comps: string | null;
}

interface Seen {
  version: 1;
  seen: Partial<Record<NewsArea, string>>;
}

const KEY = "tftlab.seen.v1";
const FRESH_DAYS = 14;

export function readSeen(): Seen {
  return readJson<Seen>(KEY, { version: 1, seen: {} });
}

export function markSeen(area: NewsArea, stamp: string | null): void {
  if (!stamp) return;
  const s = readSeen();
  s.seen[area] = stamp;
  writeJson(KEY, s);
  try {
    window.dispatchEvent(new CustomEvent("tftlab:seen"));
  } catch {
    /* ignore */
  }
}

export function isUnseen(area: NewsArea, stamps: NewsStamps, seen: Seen, now = Date.now()): boolean {
  if (area === "patch-notes") {
    if (!stamps.patchNotes) return false;
    const stored = seen.seen["patch-notes"];
    if (stored) return stored !== stamps.patchNotes;
    const at = stamps.patchNotesAt ? Date.parse(stamps.patchNotesAt) : NaN;
    return Number.isFinite(at) && now - at < FRESH_DAYS * 86_400_000;
  }
  if (!stamps.comps) return false;
  return seen.seen.comps !== stamps.comps;
}

/** Live unseen flags for the given stamps; re-renders when another component marks something seen. */
export function useUnseen(stamps: NewsStamps): Record<NewsArea, boolean> {
  const [state, setState] = useState<Record<NewsArea, boolean>>({ "patch-notes": false, comps: false });
  useEffect(() => {
    const compute = () => {
      const seen = readSeen();
      setState({ "patch-notes": isUnseen("patch-notes", stamps, seen), comps: isUnseen("comps", stamps, seen) });
    };
    compute();
    window.addEventListener("tftlab:seen", compute);
    window.addEventListener("storage", compute);
    return () => {
      window.removeEventListener("tftlab:seen", compute);
      window.removeEventListener("storage", compute);
    };
  }, [stamps]);
  return state;
}

/**
 * Snapshot of what was seen before this page marked itself seen, so the page
 * can still highlight what is new (e.g. the notes published since last visit).
 */
export function useMarkSeen(area: NewsArea, stamp: string | null): string | null | undefined {
  const [before, setBefore] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setBefore(readSeen().seen[area] ?? null);
    markSeen(area, stamp);
  }, [area, stamp]);
  return before;
}
