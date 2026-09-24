import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splitStatWords, statIconPath, statOfMarker, STAT_ICON_FILES, STAT_KEYS } from "@/lib/stat-meta";
import { ICON_LABELS } from "@/lib/text";

describe("statOfMarker", () => {
  it("maps every renderDescRich marker label to a stat icon", () => {
    for (const label of Object.values(ICON_LABELS)) expect(statOfMarker(label), label).not.toBeNull();
  });
  it("knows the gold marker and is case-insensitive", () => {
    expect(statOfMarker("goldCoins")).toBe("Gold");
    expect(statOfMarker("hp")).toBe("HP");
    expect(statOfMarker("Frobnicate")).toBeNull();
  });
});

describe("splitStatWords", () => {
  it("returns the text untouched when it names no stat", () => {
    expect(splitStatWords("Gain 3 gold.")).toEqual(["Gain 3 gold."]);
  });
  it("tags stat phrases in any case and keeps the surrounding text", () => {
    expect(splitStatWords("your team gains 4% bonus Attack Damage and Ability Power every second")).toEqual([
      "your team gains 4% bonus ",
      { stat: "AD", text: "Attack Damage" },
      " and ",
      { stat: "AP", text: "Ability Power" },
      " every second",
    ]);
    expect(splitStatWords("+20 armour, +20 magic resistance")).toEqual(["+20 ", { stat: "Armor", text: "armour" }, ", +20 ", { stat: "MR", text: "magic resistance" }]);
  });
  it("prefers the longer phrase", () => {
    expect(splitStatWords("5 Mana Regen")).toEqual(["5 ", { stat: "Mana regen", text: "Mana Regen" }]);
    expect(splitStatWords("30% Critical Strike Chance")).toEqual(["30% ", { stat: "Crit", text: "Critical Strike Chance" }]);
    expect(splitStatWords("Critical Strike Damage")).toEqual([{ stat: "Crit dmg", text: "Critical Strike Damage" }]);
  });
  it("matches abbreviations only in upper case", () => {
    expect(splitStatWords("scales AD and AP as well as HP")).toEqual(["scales ", { stat: "AD", text: "AD" }, " and ", { stat: "AP", text: "AP" }, " as well as ", { stat: "HP", text: "HP" }]);
    expect(splitStatWords("as soon as the ad ends")).toEqual(["as soon as the ad ends"]);
  });
  it("respects word boundaries", () => {
    expect(splitStatWords("Healthy gains and manaflow")).toEqual(["Healthy gains and manaflow"]);
    expect(splitStatWords("a HP-based shield")).toEqual(["a ", { stat: "HP", text: "HP" }, "-based shield"]);
  });
});

describe("stat icon files", () => {
  it("has a mirrored in-game icon for every stat (run `npm run sync-stat-icons` if this fails)", () => {
    for (const k of STAT_KEYS) {
      expect(STAT_ICON_FILES[k].source, k).toMatch(/\.png$/);
      const local = path.join(process.cwd(), "public", statIconPath(k));
      expect(fs.existsSync(local), `${k} → ${local}`).toBe(true);
    }
  });
});
