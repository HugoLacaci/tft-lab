import { describe, expect, it } from "vitest";
import { CompsFileSchema } from "@/lib/comps";
import { sanitizeHtml } from "@/lib/patch-notes";
import { classifyTags } from "@/lib/tags";
import { rankLookup, ranksById } from "@/lib/tiers";
import { renderDescRich } from "@/lib/text";

describe("tags", () => {
  it("classifies by wording", () => {
    expect(classifyTags("A Golden Quest", "The first time you have 50 gold, gain a champion")).toContain("econ");
    expect(classifyTags("Prolific Power", "your champions gain 8% Attack Damage and Ability Power")).toEqual(["combat"]);
    expect(classifyTags("Lucky 7", "gain 7 shop rerolls")).toContain("shop");
    expect(classifyTags("Blossom Crest", "Gain a Blossom Emblem", ["DA_18_Blossom"])[0]).toBe("trait");
    expect(classifyTags("Mystery", "Something happens.")).toEqual(["utility"]);
  });
});

describe("tiers", () => {
  it("looks up by normalised name and maps to ids", () => {
    const look = rankLookup({ "Guinsoo's Rageblade": "S", "Warmogs Armor": "A" });
    expect(look("Guinsoo’s Rageblade")).toBe("S");
    expect(look("guinsoos rageblade")).toBe("S");
    expect(look("Warmog's Armor")).toBe("A");
    expect(look("Nope")).toBeUndefined();
    expect(ranksById([{ id: "a", name: "Warmog's Armor" }, { id: "b", name: "Other" }], { "Warmogs Armor": "A" })).toEqual({ a: "A" });
  });
});

describe("renderDescRich", () => {
  it("keeps stat icons as markers", () => {
    expect(renderDescRich("%i:scaleAD% +@AD*100@% Attack Damage", { AD: 0.1 })).toBe("[[AD]] +10% Attack Damage");
    expect(renderDescRich("Deal @X@ %i:scaleAP% damage", {})).toBe("Deal {X} [[AP]] damage");
  });
});

describe("sanitizeHtml", () => {
  it("strips scripts, unknown tags and attributes, keeps safe ones", () => {
    const out = sanitizeHtml(`<div id="x" onclick="evil()"><script>alert(1)</script><h2 id="top" class="c">Title</h2><p style="color:red">Hi <a href="/en-us/x" onclick="e()">link</a> <iframe src="x"></iframe><custom>kept text</custom></p><img src="javascript:bad" alt="a"/></div>`);
    expect(out).not.toMatch(/script|onclick|iframe|style=|class=/);
    expect(out).toContain('<h2 id="top">Title</h2>');
    expect(out).toContain('href="https://teamfighttactics.leagueoflegends.com/en-us/x"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("kept text");
    expect(out).toContain('<img alt="a" />');
    expect(out).not.toContain("javascript:");
  });
});

describe("comps schema", () => {
  it("rejects two units on one hex", () => {
    const r = CompsFileSchema.safeParse({
      patch: "1",
      verifiedOn: "2026-01-01",
      comps: [
        {
          id: "x",
          name: "X",
          tier: "A",
          style: "standard",
          summary: "A summary long enough.",
          board: [
            ["a", 0, 0, 2, []],
            ["b", 0, 0, 2, []],
            ["c", 1, 0, 2, []],
            ["d", 2, 0, 2, []],
          ],
          carries: [{ championId: "a", items: [] }],
          howToPlay: ["play"],
          positioning: "somewhere sensible",
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});
