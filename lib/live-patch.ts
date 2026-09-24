import { CURRENT_SET } from "./current-set";
import { loadPatchNotes } from "./patch-notes";
import { loadComps } from "./comps";
import { isCuratedStale } from "./patch-version";

/**
 * The patch players know ("18.3"), which is NOT what CommunityDragon reports
 * (`current.json.patch` is the client build, "16.19"). The newest patch note
 * names the live patch; the client build is the fallback when notes are not
 * synced. Server-only (reads data/generated).
 */
export interface LivePatch {
  /** "18.3" when known from the patch notes, else the client build */
  label: string;
  /** true when `label` came from Riot's patch notes */
  fromNotes: boolean;
  /** ISO date the note was published, when known */
  publishedAt: string | null;
  /** /set/patch-notes when synced */
  notesHref: string | null;
  /** Riot's article, when synced */
  notesUrl: string | null;
}

export function livePatch(): LivePatch {
  const notes = loadPatchNotes();
  const newest = notes?.notes.find((n) => n.patch) ?? null;
  if (newest?.patch) return { label: newest.patch, fromNotes: true, publishedAt: newest.publishedAt, notesHref: "/set/patch-notes", notesUrl: newest.url };
  return { label: CURRENT_SET.patch, fromNotes: false, publishedAt: null, notesHref: notes ? "/set/patch-notes" : null, notesUrl: null };
}

/** The curated comps and the live patch, and whether the comps predate it. */
export function compsFreshness(): { curatedPatch: string | null; verifiedOn: string | null; live: LivePatch; stale: boolean } {
  const comps = loadComps();
  const live = livePatch();
  const curatedPatch = comps?.patch ?? null;
  return { curatedPatch, verifiedOn: comps?.verifiedOn ?? null, live, stale: live.fromNotes && isCuratedStale(curatedPatch, live.label) };
}
