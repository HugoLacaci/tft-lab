import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { COST_COLORS, STYLE_COLORS } from "@/lib/costs";

const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

describe("cost colours are mirrored in globals.css", () => {
  for (const [cost, hex] of Object.entries(COST_COLORS)) {
    it(`--cost-${cost} is ${hex}`, () => {
      expect(css).toMatch(new RegExp(`--cost-${cost}:\\s*${hex};`));
    });
  }
  for (const [style, hex] of Object.entries(STYLE_COLORS)) {
    it(`--style-${style} is ${hex}`, () => {
      expect(css).toMatch(new RegExp(`--style-${style}:\\s*${hex};`));
    });
  }
});
