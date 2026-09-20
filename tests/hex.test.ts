import { describe, expect, it } from "vitest";
import { boardSize, displayCoord, hexOffset, HEX_H_RATIO, inBounds } from "@/lib/hex";

describe("hex geometry", () => {
  it("shifts odd rows right by half a hex", () => {
    expect(hexOffset(0, 0)).toEqual({ x: 0, y: 0 });
    expect(hexOffset(1, 0).x).toBe(0.5);
    expect(hexOffset(2, 3).x).toBe(3);
  });
  it("steps rows by 0.75 × hex height", () => {
    expect(hexOffset(1, 0).y).toBeCloseTo(0.75 * HEX_H_RATIO);
    expect(hexOffset(3, 0).y).toBeCloseTo(2.25 * HEX_H_RATIO);
  });
  it("board is 7.5 hexes wide and 3.25 hex-heights tall for 4 rows", () => {
    const s = boardSize(4);
    expect(s.w).toBe(7.5);
    expect(s.h).toBeCloseTo(3.25 * HEX_H_RATIO);
  });
  it("mirrors the enemy board in versus mode", () => {
    expect(displayCoord("enemy", { row: 0, col: 0 }, "versus")).toEqual({ drow: 3, dcol: 6 });
    expect(displayCoord("enemy", { row: 3, col: 6 }, "versus")).toEqual({ drow: 0, dcol: 0 });
    expect(displayCoord("own", { row: 0, col: 0 }, "versus")).toEqual({ drow: 4, dcol: 0 });
    expect(displayCoord("own", { row: 3, col: 6 }, "own")).toEqual({ drow: 3, dcol: 6 });
  });
  it("bounds", () => {
    expect(inBounds({ row: 3, col: 6 })).toBe(true);
    expect(inBounds({ row: 4, col: 0 })).toBe(false);
    expect(inBounds({ row: 0, col: 7 })).toBe(false);
  });
});
