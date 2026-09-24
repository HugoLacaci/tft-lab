import { describe, expect, it } from "vitest";
import { groupResults, normalize, searchIndex, type SearchRecord } from "@/lib/search";
import { activeNavHref } from "@/components/layout/nav";

const INDEX: SearchRecord[] = [
  { k: "champion", n: "Ashe", h: "/set/champions/a/", s: "4-cost · Blossom, Rapidfire", c: 4, w: "Blossom Rapidfire" },
  { k: "champion", n: "Kha'Zix", h: "/set/champions/k/", s: "1-cost", c: 1, w: "Lunar Ravager" },
  { k: "comp", n: "Ashe Fast 9", h: "/set/comps/#comp-ashe-fast-9", s: "S tier · fast-9", w: "Ashe Xayah Rakan" },
  { k: "item", n: "Guinsoo's Rageblade", h: "/set/items/#g", s: "completed" },
  { k: "item", n: "Rapid Firecannon", h: "/set/items/#r", s: "completed" },
  { k: "trait", n: "Rapidfire", h: "/set/traits/#rf", s: "5 champions" },
  { k: "page", n: "Comps tier list", h: "/set/comps/", s: "Current patch" },
];

describe("search", () => {
  it("normalises accents and apostrophes", () => {
    expect(normalize("Kha’Zix")).toBe("khazix");
    expect(normalize("Guinsoo's  Rageblade!")).toBe("guinsoos rageblade");
  });

  it("ranks exact and prefix name matches first, then words", () => {
    const r = searchIndex(INDEX, "ashe").map((x) => x.n);
    expect(r[0]).toBe("Ashe");
    expect(r[1]).toBe("Ashe Fast 9");
    expect(r).not.toContain("Rapidfire");
  });

  it("requires every token", () => {
    expect(searchIndex(INDEX, "rapid fire").map((x) => x.n)).toEqual(expect.arrayContaining(["Rapid Firecannon", "Rapidfire"]));
    expect(searchIndex(INDEX, "ashe rage")).toEqual([]);
  });

  it("matches units inside a comp and traits on a champion", () => {
    expect(searchIndex(INDEX, "xayah").map((x) => x.n)).toEqual(["Ashe Fast 9"]);
    expect(searchIndex(INDEX, "lunar").map((x) => x.n)).toEqual(["Kha'Zix"]);
  });

  it("returns nothing for an empty query and groups in kind order", () => {
    expect(searchIndex(INDEX, "   ")).toEqual([]);
    const groups = groupResults(searchIndex(INDEX, "rapid"));
    expect(groups.map((g) => g.kind)).toEqual(["champion", "trait", "item"]);
  });
});

describe("activeNavHref", () => {
  it("lights the most specific item", () => {
    expect(activeNavHref("/set/comps/")).toBe("/set/comps");
    expect(activeNavHref("/set/champions/DA_18_Ashe/")).toBe("/set");
    expect(activeNavHref("/trainer/puzzles/")).toBe("/trainer");
    expect(activeNavHref("/")).toBeNull();
  });
});
