import { describe, expect, it } from "vitest";
import { LESSONS, MODULES, isUnlocked, lessonProgress, nextLessonAfter, orderedLessons, previousLesson } from "@/lib/curriculum";
import { emptyProgress, missedIds } from "@/lib/progress";
import { solutionFor, hasBoardSolution } from "@/lib/solution";
import { ScenarioSchema } from "@/lib/scenario-schema";

describe("curriculum data", () => {
  it("has unique lesson ids, valid modules and an order without gaps", () => {
    const ids = new Set<string>();
    for (const l of LESSONS) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(MODULES.some((m) => m.id === l.module)).toBe(true);
      expect(l.outcomes.length).toBeGreaterThanOrEqual(3);
      expect(l.intro.length).toBeGreaterThan(120);
    }
    for (const m of MODULES) {
      const orders = LESSONS.filter((l) => l.module === m.id).map((l) => l.order).sort((a, b) => a - b);
      expect(orders).toEqual(orders.map((_, i) => i + 1));
    }
  });
  it("orders lessons module by module and links neighbours", () => {
    const all = orderedLessons();
    expect(all[0]!.module).toBe("welcome");
    expect(all[all.length - 1]!.module).toBe("mastery");
    expect(previousLesson(all[0]!.id)).toBeNull();
    expect(nextLessonAfter(all[0]!.id)?.id).toBe(all[1]!.id);
    expect(nextLessonAfter(all[all.length - 1]!.id)).toBeNull();
  });
});

describe("lessonProgress", () => {
  const ids = ["a", "b", "c", "d", "e"];
  it("passes at 70% solved and completes at 100%", () => {
    const seen = { a: { attempts: 1, correct: 1 }, b: { attempts: 2, correct: 1 }, c: { attempts: 1, correct: 1 }, d: { attempts: 3, correct: 0 } };
    const p = lessonProgress(ids, seen, true);
    expect(p).toMatchObject({ state: "started", solved: 3, tried: 4, total: 5 });
    const p2 = lessonProgress(ids, { ...seen, d: { attempts: 4, correct: 1 } }, true);
    expect(p2.state).toBe("passed");
    const p3 = lessonProgress(ids, { ...seen, d: { attempts: 4, correct: 1 }, e: { attempts: 1, correct: 1 } }, true);
    expect(p3.state).toBe("complete");
    expect(lessonProgress(ids, {}, false).state).toBe("locked");
    expect(lessonProgress(ids, {}, true).state).toBe("new");
  });
});

describe("isUnlocked", () => {
  const first = orderedLessons()[0]!;
  const second = orderedLessons()[1]!;
  const adv = LESSONS.find((l) => l.module === "advanced" && l.order === 1)!;
  const adv2 = LESSONS.find((l) => l.module === "advanced" && l.order === 2)!;
  it("opens the first lesson, everything under the placement, and the lesson after a passed one", () => {
    const none = () => false;
    expect(isUnlocked(first.id, { placed: undefined, passed: none })).toBe(true);
    expect(isUnlocked(second.id, { placed: undefined, passed: none })).toBe(true); // module 0 is under the default placement (1)
    expect(isUnlocked(adv.id, { placed: undefined, passed: none })).toBe(false);
    expect(isUnlocked(adv.id, { placed: 3, passed: none })).toBe(true);
    expect(isUnlocked(adv2.id, { placed: 0, passed: (id) => id === adv.id })).toBe(true);
    expect(isUnlocked(adv2.id, { placed: 0, passed: none })).toBe(false);
  });
});

describe("missedIds", () => {
  it("lists drills whose last attempt was wrong, most recent first, and tolerates old entries", () => {
    const p = emptyProgress();
    p.seen = {
      ok: { attempts: 2, correct: 1, last: true, at: 5 },
      bad1: { attempts: 1, correct: 0, last: false, at: 1 },
      bad2: { attempts: 3, correct: 2, last: false, at: 9 },
      legacyNever: { attempts: 2, correct: 0 },
      legacyOnce: { attempts: 2, correct: 1 },
    };
    expect(missedIds(p)).toEqual(["bad2", "bad1", "legacyNever"]);
  });
});

describe("solutionFor", () => {
  const base = {
    id: "s",
    category: "positioning" as const,
    difficulty: 1 as const,
    setAgnostic: true,
    prompt: "Where does the carry go on this board?",
    state: {
      stage: "3-2",
      gold: 30,
      hp: 80,
      level: 5,
      xpToNext: 10,
      streak: { type: "win" as const, count: 1 },
      board: [
        { championId: "generic:tank-2", row: 0, col: 3, star: 2 as const, items: [] },
        { championId: "generic:carry-2", row: 3, col: 1, star: 2 as const, items: [] },
      ],
      bench: [],
      shop: [null, null, null, null, null],
      items: [],
    },
    explanation: "The carry belongs in the back row where nothing reaches it before it has dealt its damage; the tank stands in front.",
    principle: "Tanks front, carries back.",
    guideLink: "/guides/positioning",
  };
  const names = (id: string) => id;
  it("draws a placement on the first accepted hex", () => {
    const s = ScenarioSchema.parse({ ...base, question: { type: "placement", unitId: "generic:caster-1", correctHexes: [{ row: 3, col: 5 }, { row: 3, col: 6 }] } });
    const sol = solutionFor(s, names)!;
    expect(hasBoardSolution(s)).toBe(true);
    expect(sol.board.find((u) => u.championId === "generic:caster-1")).toMatchObject({ row: 3, col: 5 });
    expect(sol.marks).toHaveLength(2);
  });
  it("swaps the two units", () => {
    const s = ScenarioSchema.parse({ ...base, question: { type: "swap", correctPairs: [["generic:tank-2", "generic:carry-2"]] } });
    const sol = solutionFor(s, names)!;
    expect(sol.board.find((u) => u.championId === "generic:tank-2")).toMatchObject({ row: 3, col: 1 });
    expect(sol.board.find((u) => u.championId === "generic:carry-2")).toMatchObject({ row: 0, col: 3 });
  });
  it("puts the item on the holder and gives text answers for choices", () => {
    const s = ScenarioSchema.parse({ ...base, category: "items", question: { type: "item-holder", itemId: "generic:item:tank-completed", correctUnitIds: ["generic:tank-2"] } });
    const sol = solutionFor(s, names)!;
    expect(sol.board.find((u) => u.championId === "generic:tank-2")!.items).toEqual(["generic:item:tank-completed"]);
    const c = ScenarioSchema.parse({ ...base, category: "econ", question: { type: "choice", options: [{ id: "a", label: "Hold" }, { id: "b", label: "Roll" }], correct: ["a"] } });
    expect(hasBoardSolution(c)).toBe(false);
    expect(solutionFor(c, names)!.text).toBe("Hold");
  });
});
