/**
 * Fight geometry: both boards on one 8×7 odd-r grid, blue below (display
 * rows 4..7), red above mirrored (display rows 0..3), exactly as
 * lib/hex.ts#displayCoord draws the versus board.
 */
import { COLS, displayCoord } from "../hex";
import type { Side } from "./types";

export interface Cell {
  drow: number;
  dcol: number;
}

export function toCell(side: Side, row: number, col: number): Cell {
  const { drow, dcol } = displayCoord(side === "blue" ? "own" : "enemy", { row, col }, "versus");
  return { drow, dcol };
}

/** odd-r offset → cube coordinates. */
function cube(c: Cell): [number, number, number] {
  const x = c.dcol - (c.drow - (c.drow & 1)) / 2;
  const z = c.drow;
  return [x, -x - z, z];
}

export function hexDistance(a: Cell, b: Cell): number {
  const [ax, ay, az] = cube(a);
  const [bx, by, bz] = cube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

const EVEN_DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, 0],
  [1, -1],
];
const ODD_DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [1, 0],
  [1, 1],
];

export function neighbours(c: Cell): Cell[] {
  const dirs = c.drow & 1 ? ODD_DIRS : EVEN_DIRS;
  const out: Cell[] = [];
  for (const [dr, dc] of dirs) {
    const drow = c.drow + dr;
    const dcol = c.dcol + dc;
    if (drow >= 0 && drow < 8 && dcol >= 0 && dcol < COLS) out.push({ drow, dcol });
  }
  return out;
}

export function cellKey(c: Cell): string {
  return `${c.drow},${c.dcol}`;
}
