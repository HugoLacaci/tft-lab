import type { Question } from "./scenario-schema";
import { sameHex, type HexCoord } from "./hex";

/**
 * Pure grading. `answer` shape depends on the question type:
 *   choice      → string[] (selected option ids)
 *   placement   → HexCoord (where the unit was put)
 *   augment     → string (augment id)
 *   item-holder → string (unit id)
 *   ordering    → number[] (indices of steps in the chosen order)
 */
export type Answer = string[] | HexCoord | string | number[];

export interface Grade {
  correct: boolean;
  /** 0..1, for partial credit display; ordering and multi-choice can be partial. */
  score: number;
  detail: string;
}

export function grade(q: Question, answer: Answer): Grade {
  switch (q.type) {
    case "choice": {
      const picked = Array.isArray(answer) ? (answer as string[]) : [];
      const correct = new Set(q.correct);
      const hits = picked.filter((p) => correct.has(p)).length;
      const wrong = picked.length - hits;
      const ok = hits === correct.size && wrong === 0;
      return { correct: ok, score: ok ? 1 : Math.max(0, (hits - wrong) / correct.size), detail: ok ? "Correct." : `Correct answer: ${q.correct.join(", ")}.` };
    }
    case "placement": {
      const hex = answer as HexCoord;
      const ok = q.correctHexes.some((h) => sameHex(h, hex));
      return { correct: ok, score: ok ? 1 : 0, detail: ok ? "Correct hex." : "Not one of the accepted hexes." };
    }
    case "augment": {
      const ok = answer === q.correct;
      return { correct: ok, score: ok ? 1 : 0, detail: ok ? "Correct pick." : "Wrong pick." };
    }
    case "item-holder": {
      const ok = typeof answer === "string" && q.correctUnitIds.includes(answer);
      return { correct: ok, score: ok ? 1 : 0, detail: ok ? "Right holder." : "Wrong holder." };
    }
    case "ordering": {
      const order = Array.isArray(answer) ? (answer as number[]) : [];
      const n = q.correctOrder.length;
      let hits = 0;
      for (let i = 0; i < n; i++) if (order[i] === q.correctOrder[i]) hits++;
      const ok = hits === n;
      return { correct: ok, score: hits / n, detail: ok ? "Correct order." : `${hits} of ${n} steps in the right place.` };
    }
  }
}
