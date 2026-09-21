"use client";

import { useTrainer } from "@/lib/trainer-store";

/** Solved / total for a tier, from the browser's trainer progress. */
export function TierProgress({ ids }: { ids: string[] }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  if (!hydrated) return <span className="text-xs text-dim">{ids.length} puzzles</span>;
  const solved = ids.filter((id) => (progress.seen[id]?.correct ?? 0) > 0).length;
  const tried = ids.filter((id) => progress.seen[id]).length;
  return (
    <span className="text-xs text-dim">
      <span className="display text-base text-gold-bright">{solved}</span>/{ids.length} solved{tried > solved ? ` · ${tried - solved} to retry` : ""}
    </span>
  );
}

/** Tick on a puzzle card: solved, attempted, or new. */
export function PuzzleTick({ id }: { id: string }) {
  const progress = useTrainer((s) => s.progress);
  const hydrated = useTrainer((s) => s.hydrated);
  const seen = hydrated ? progress.seen[id] : undefined;
  if (!seen) return <span className="chip">new</span>;
  if (seen.correct > 0)
    return (
      <span className="chip chip-active" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
        ✓ solved
      </span>
    );
  return (
    <span className="chip" style={{ color: "var(--red)", borderColor: "var(--red)" }}>
      retry
    </span>
  );
}
