"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTrainer } from "@/lib/trainer-store";
import { moduleById, previousLesson, type Lesson } from "@/lib/curriculum";
import { usePath } from "./PathMap";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";

/**
 * Wraps a lesson's session: a locked lesson shows what to finish first and a
 * one-click "unlock anyway" (which places the player at that module), instead
 * of a wall. Everything below the player's placement is always open.
 */
export function LessonGate({ lesson, lessonIds, children }: { lesson: Lesson; lessonIds: Record<string, string[]>; children: ReactNode }) {
  const { hydrated, state } = usePath(lessonIds);
  const setPlaced = useTrainer((s) => s.setPlaced);
  if (!hydrated) return <p className="text-dim">Loading…</p>;
  const st = state.get(lesson.id);
  if (st?.state !== "locked") return <>{children}</>;
  const prev = previousLesson(lesson.id);
  const mod = moduleById(lesson.module)!;
  return (
    <Panel className="pop" glow={mod.color}>
      <div className="flex items-start gap-3">
        <Glyph name="lock" size={28} className="mt-1 shrink-0 text-gold" />
        <div>
          <h2 className="text-lg">This lesson is still locked</h2>
          <p className="mt-1 text-sm text-dim">
            Lessons open in order so each one can assume the last. {prev ? <>Pass <Link href={`/trainer/path/${prev.id}`}>{prev.title}</Link> (70% of its drills solved) and this one opens.</> : null} If you already know this material, unlock the module and start here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {prev ? (
              <Link href={`/trainer/path/${prev.id}`} className="btn btn-primary">
                Go to {prev.title}
              </Link>
            ) : null}
            <button type="button" className="btn" onClick={() => setPlaced(mod.index)}>
              Unlock {mod.title} anyway
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
