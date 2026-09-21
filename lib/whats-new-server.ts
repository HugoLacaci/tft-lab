import { loadPatchNotes } from "./patch-notes";
import { compsChangesStamp } from "./comps-changes";
import { loadCompsChanges } from "./comps-changes-server";
import type { NewsStamps } from "./whats-new";

/** Build-time stamps for the NEW markers (see lib/whats-new.ts). */
export function newsStamps(): NewsStamps {
  const notes = loadPatchNotes();
  const latest = notes?.notes[0] ?? null;
  return {
    patchNotes: latest?.slug ?? null,
    patchNotesAt: latest?.publishedAt ?? null,
    comps: compsChangesStamp(loadCompsChanges()),
  };
}
