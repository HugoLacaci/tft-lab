import { loadScenarios } from "./scenarios";
import type { Scenario } from "./scenario-schema";
import { LESSONS, orderedLessons, type Lesson } from "./curriculum";

/**
 * Server-side glue between the curriculum (pure data) and the scenario files.
 * A lesson's drills are the scenarios that carry its id, in path-friendly
 * order: easier first, then file order (stable across builds).
 */
export function scenariosByLesson(lessonId: string): Scenario[] {
  return loadScenarios()
    .filter((s) => s.lesson === lessonId)
    .sort((a, b) => a.difficulty - b.difficulty);
}

/** lesson id → scenario ids, for the path map and the home page (small payload). */
export function lessonScenarioIds(): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(LESSONS.map((l) => [l.id, []]));
  for (const s of loadScenarios()) if (s.lesson && out[s.lesson]) out[s.lesson]!.push(s.id);
  return out;
}

/** Lessons that have at least one drill, in path order (a lesson without drills is hidden, not broken). */
export function liveLessons(): Lesson[] {
  const ids = lessonScenarioIds();
  return orderedLessons().filter((l) => (ids[l.id]?.length ?? 0) > 0);
}
