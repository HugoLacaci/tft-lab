import { describe, expect, it } from "vitest";
import { comparePatch, isCuratedStale, parsePatch } from "@/lib/patch-version";

describe("patch labels", () => {
  it("parses Riot's labels", () => {
    expect(parsePatch("18.3")).toEqual({ set: 18, minor: 3, hotfix: "" });
    expect(parsePatch("18.2b")).toEqual({ set: 18, minor: 2, hotfix: "b" });
    expect(parsePatch("16.19")).toEqual({ set: 16, minor: 19, hotfix: "" });
    expect(parsePatch("Set 18")).toBeNull();
    expect(parsePatch(null)).toBeNull();
  });

  it("orders base patches and hotfixes", () => {
    expect(comparePatch("18.2", "18.3")).toBe(-1);
    expect(comparePatch("18.2b", "18.2")).toBe(1);
    expect(comparePatch("18.3", "18.3")).toBe(0);
    expect(comparePatch("18.10", "18.9")).toBe(1);
    expect(comparePatch("junk", "18.3")).toBe(0);
  });

  it("marks curated content stale only when a newer base patch is live", () => {
    expect(isCuratedStale("18.2b", "18.3")).toBe(true);
    expect(isCuratedStale("18.3", "18.3b")).toBe(false);
    expect(isCuratedStale("18.3", "18.3")).toBe(false);
    expect(isCuratedStale("17.9", "18.1")).toBe(true);
    expect(isCuratedStale(null, "18.3")).toBe(false);
    expect(isCuratedStale("18.3", "16.19")).toBe(false);
  });
});
