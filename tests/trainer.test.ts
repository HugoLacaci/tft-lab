import { describe, expect, it } from "vitest";
import { grade } from "@/lib/grading";
import { isDue, newEntry, review } from "@/lib/srs";
import { dayStreak, emptyProgress, weakestCategories } from "@/lib/progress";
import { drawDaily } from "@/lib/daily";
import { extractSection, headings } from "@/lib/guide-sections";
import { ScenarioSchema } from "@/lib/scenario-schema";
import type { Scenario } from "@/lib/scenario-schema";

const DAY = 86_400_000;

describe("grade", () => {
  it("choice: exact set required", () => {
    const q = { type: "choice" as const, options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], correct: ["a"] };
    expect(grade(q, ["a"]).correct).toBe(true);
    expect(grade(q, ["a", "b"]).correct).toBe(false);
    expect(grade(q, ["b"]).correct).toBe(false);
  });
  it("placement: any accepted hex", () => {
    const q = { type: "placement" as const, unitId: "x", correctHexes: [{ row: 3, col: 0 }, { row: 3, col: 6 }] };
    expect(grade(q, { row: 3, col: 6 }).correct).toBe(true);
    expect(grade(q, { row: 0, col: 6 }).correct).toBe(false);
  });
  it("ordering: partial credit", () => {
    const q = { type: "ordering" as const, steps: ["a", "b", "c", "d"], correctOrder: [0, 1, 2, 3] };
    expect(grade(q, [0, 1, 3, 2]).score).toBe(0.5);
    expect(grade(q, [0, 1, 2, 3]).correct).toBe(true);
  });
});

describe("srs", () => {
  it("misses come back after 1, 3, 7 days", () => {
    const t0 = 1_000_000;
    let e = review(newEntry("s", t0), false, t0);
    expect(e.interval).toBe(1);
    expect(e.lapses).toBe(1);
    expect(isDue(e, t0 + DAY - 1)).toBe(false);
    expect(isDue(e, t0 + DAY)).toBe(true);
    e = review(e, true, t0 + DAY);
    expect(e.interval).toBe(3);
    e = review(e, true, t0 + 4 * DAY);
    expect(e.interval).toBe(7);
    e = review(e, false, t0 + 11 * DAY);
    expect(e.interval).toBe(1);
    expect(e.lapses).toBe(2);
  });
});

describe("progress", () => {
  it("day streak counts consecutive days ending today or yesterday", () => {
    expect(dayStreak(["2026-09-18", "2026-09-19", "2026-09-20"], "2026-09-20")).toBe(3);
    expect(dayStreak(["2026-09-18", "2026-09-19"], "2026-09-20")).toBe(2);
    expect(dayStreak(["2026-09-17"], "2026-09-20")).toBe(0);
  });
  it("weakest categories: low accuracy first, unseen counted as weak", () => {
    const p = emptyProgress();
    p.perCategory.econ = { attempts: 10, correct: 9 };
    p.perCategory.items = { attempts: 10, correct: 2 };
    const order = weakestCategories(p);
    expect(order[0]).toBe("items");
    expect(order[order.length - 1]).toBe("econ");
  });
});

function fakeScenario(id: string, category: Scenario["category"]): Scenario {
  return ScenarioSchema.parse({
    id,
    category,
    difficulty: 1,
    setAgnostic: true,
    prompt: "What is the right call here, given the board?",
    state: { stage: "3-2", gold: 50, hp: 80, level: 6, xpToNext: 10, streak: { type: "win", count: 2 }, board: [], bench: [], shop: [null, null, null, null, null], items: [] },
    question: { type: "choice", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], correct: ["a"] },
    explanation: "Because of interest and tempo and the fact that this explanation needs to be at least eighty characters long to validate.",
    principle: "Do the right thing.",
    guideLink: "/guides/economy",
  });
}

describe("drawDaily", () => {
  it("draws n distinct scenarios, due cards first, weighted to weak categories", () => {
    const all = [
      ...Array.from({ length: 8 }, (_, i) => fakeScenario(`e${i}`, "econ")),
      ...Array.from({ length: 8 }, (_, i) => fakeScenario(`i${i}`, "items")),
    ];
    const p = emptyProgress();
    p.perCategory.econ = { attempts: 20, correct: 20 };
    p.perCategory.items = { attempts: 20, correct: 4 };
    p.srs["e3"] = { scenarioId: "e3", ease: 2, interval: 1, dueAt: 0, lapses: 1, reps: 1 };
    const d = drawDaily(all, p, 10, { seed: 42, now: 1 });
    expect(d.length).toBe(10);
    expect(new Set(d.map((s) => s.id)).size).toBe(10);
    expect(d[0]!.id).toBe("e3");
    const items = d.filter((s) => s.category === "items").length;
    expect(items).toBeGreaterThanOrEqual(5);
  });
});

describe("guide sections", () => {
  const md = `---\ntitle: x\n---\nIntro text.\n\n## Interest and the 50 gold floor\n\nBody A.\n\n### Sub\n\nSub body.\n\n## Second\n\nBody B.\n`;
  it("slugs headings like rehype-slug", () => {
    expect(headings(md).map((h) => h.slug)).toEqual(["interest-and-the-50-gold-floor", "sub", "second"]);
  });
  it("extracts a section up to the next heading of same level", () => {
    const s = extractSection(md, "interest-and-the-50-gold-floor")!;
    expect(s).toContain("Body A.");
    expect(s).toContain("Sub body.");
    expect(s).not.toContain("Body B.");
    expect(extractSection(md, "nope")).toBeNull();
  });
});
