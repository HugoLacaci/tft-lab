import { describe, expect, it } from "vitest";
import { CompsFileSchema, type CompsFile } from "@/lib/comps";
import { advanceHistory, changeCounts, compsChangesStamp, diffComp, diffComps } from "@/lib/comps-changes";
import { isUnseen } from "@/lib/whats-new";

const file = (patch: string, comps: Partial<CompsFile["comps"][number]>[]): CompsFile =>
  CompsFileSchema.parse({
    patch,
    verifiedOn: "2026-09-20",
    comps: comps.map((c) => ({
      id: "x",
      name: "X",
      tier: "A",
      style: "standard",
      summary: "A summary long enough.",
      board: [
        ["a", 0, 3, 2, ["i1"]],
        ["b", 0, 2, 2, []],
        ["c", 3, 3, 2, ["i2", "i3"]],
        ["d", 3, 1, 1, []],
      ],
      carries: [{ championId: "c", items: ["i2", "i3"] }],
      augments: [{ augmentId: "g1" }],
      howToPlay: ["play"],
      positioning: "somewhere sensible",
      ...c,
    })),
  });

describe("diffComp", () => {
  const base = file("18.2", [{}]).comps[0]!;
  it("returns null when nothing changed", () => {
    expect(diffComp(base, { ...base }, {})).toBeNull();
  });
  it("reports tier moves with direction and keeps the details", () => {
    const up = diffComp(base, { ...base, tier: "S", augments: [{ augmentId: "g2" }] }, { g1: "Gold One", g2: "Gold Two" })!;
    expect(up.kind).toBe("up");
    expect(up.from).toBe("A");
    expect(up.to).toBe("S");
    expect(up.details).toEqual(["Augments: +Gold Two, −Gold One"]);
    expect(diffComp(base, { ...base, tier: "C" }, {})!.kind).toBe("down");
  });
  it("describes board, position, item and text adjustments", () => {
    const next = {
      ...base,
      board: [
        ["a", 0, 4, 2, ["i1"]],
        ["b", 0, 2, 2, []],
        ["c", 3, 3, 2, ["i2", "i4"]],
        ["e", 3, 1, 1, []],
      ] as CompsFile["comps"][number]["board"],
      carries: [{ championId: "c", items: ["i2", "i4"] }],
      positioning: "somewhere else",
    };
    const d = diffComp(base, next, { a: "Aatrox", d: "Dee", e: "Eve", c: "Cee", i2: "Two", i3: "Three", i4: "Four" })!;
    expect(d.kind).toBe("adjusted");
    expect(d.details).toContain("Board: +Eve, −Dee");
    expect(d.details).toContain("Repositioned: Aatrox");
    expect(d.details).toContain("Items on Cee: Two + Three → Two + Four");
    expect(d.details).toContain("Guide text updated");
  });
});

describe("diffComps / advanceHistory", () => {
  it("flags new and removed comps and rolls the baseline on a new patch label", () => {
    const v1 = file("18.2", [{ id: "one" }, { id: "two" }]);
    const v2 = file("18.2", [{ id: "one", tier: "S" }, { id: "three" }]);
    const v3 = file("18.3", [{ id: "one", tier: "S" }, { id: "three" }, { id: "four" }]);

    const step1 = advanceHistory({ baseline: null, latest: null }, v1);
    expect(step1.changes.since).toBeNull();
    expect(Object.keys(step1.changes.changes)).toEqual([]);

    const step2 = advanceHistory(step1.history, v2);
    // same patch label: no baseline yet, so still nothing to report
    expect(step2.changes.since).toBeNull();

    const step3 = advanceHistory(step2.history, v3);
    expect(step3.changes.since).toBe("18.2");
    expect(step3.history.baseline?.comps.map((c) => c.id)).toEqual(["one", "three"]);
    expect(step3.changes.changes.four?.kind).toBe("new");
    expect(step3.changes.changes.one).toBeUndefined();

    const direct = diffComps(v1, v3);
    expect(direct.changes.one?.kind).toBe("up");
    expect(direct.removed.map((r) => r.id)).toEqual(["two"]);
    expect(changeCounts(direct)).toEqual({ new: 2, up: 1, down: 0, adjusted: 0 });
    expect(compsChangesStamp(direct)).toContain("18.3");
    expect(compsChangesStamp(step1.changes)).toBeNull();
  });
});

describe("isUnseen", () => {
  const stamps = { patchNotes: "p2", patchNotesAt: "2026-09-20T00:00:00Z", comps: "c1" };
  const now = Date.parse("2026-09-21T00:00:00Z");
  it("compares stored stamps, and treats a fresh note as new for first-time visitors", () => {
    expect(isUnseen("patch-notes", stamps, { version: 1, seen: {} }, now)).toBe(true);
    expect(isUnseen("patch-notes", stamps, { version: 1, seen: {} }, now + 30 * 86_400_000)).toBe(false);
    expect(isUnseen("patch-notes", stamps, { version: 1, seen: { "patch-notes": "p1" } }, now)).toBe(true);
    expect(isUnseen("patch-notes", stamps, { version: 1, seen: { "patch-notes": "p2" } }, now)).toBe(false);
    expect(isUnseen("comps", stamps, { version: 1, seen: {} }, now)).toBe(true);
    expect(isUnseen("comps", stamps, { version: 1, seen: { comps: "c1" } }, now)).toBe(false);
    expect(isUnseen("comps", { ...stamps, comps: null }, { version: 1, seen: {} }, now)).toBe(false);
  });
});
