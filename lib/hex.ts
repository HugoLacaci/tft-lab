/**
 * Hex board geometry. Pointy-top hexagons in an odd-r offset layout:
 *   - odd rows are shifted right by half a hex width;
 *   - vertical step between rows is 0.75 × hex height;
 *   - hex height = hex width × 2/√3.
 *
 * Coordinates: { row: 0..3, col: 0..6 } per player. Row 0 is the frontline
 * (nearest the enemy), row 3 is the backline. Every scenario depends on this.
 */
export const ROWS = 4;
export const COLS = 7;
export const HEX_H_RATIO = 2 / Math.sqrt(3); // 1.1547

export interface HexCoord {
  row: number;
  col: number;
}

/** Position of a hex's top-left corner in hex-width units, given its display row. */
export function hexOffset(displayRow: number, col: number): { x: number; y: number } {
  const x = col + (displayRow % 2 === 1 ? 0.5 : 0);
  const y = displayRow * 0.75 * HEX_H_RATIO;
  return { x, y };
}

/** Total board size in hex-width units for `rows` display rows. */
export function boardSize(rows: number): { w: number; h: number } {
  return { w: COLS + 0.5, h: (0.75 * (rows - 1) + 1) * HEX_H_RATIO };
}

/**
 * In versus mode the enemy board sits above ours, rotated 180°: enemy
 * backline (row 3) at the top, enemy frontline (row 0) touching the divider,
 * enemy col 0 on the right. Our board keeps its natural orientation below.
 * Returns the display row (0..7) and display col for a hex.
 */
export function displayCoord(side: "own" | "enemy", hex: HexCoord, mode: "own" | "versus"): { drow: number; dcol: number } {
  if (mode === "own") return { drow: hex.row, dcol: hex.col };
  if (side === "enemy") return { drow: 3 - hex.row, dcol: COLS - 1 - hex.col };
  return { drow: 4 + hex.row, dcol: hex.col };
}

export function inBounds(h: HexCoord): boolean {
  return h.row >= 0 && h.row < ROWS && h.col >= 0 && h.col < COLS;
}

export function sameHex(a: HexCoord | null | undefined, b: HexCoord | null | undefined): boolean {
  return !!a && !!b && a.row === b.row && a.col === b.col;
}

export function hexKey(h: HexCoord): string {
  return `${h.row},${h.col}`;
}

/** Human label for screen readers: "row 0 col 3" reads poorly; use frontline/backline language. */
export function hexLabel(h: HexCoord): string {
  const rowName = ["front row", "second row", "third row", "back row"][h.row] ?? `row ${h.row}`;
  return `${rowName}, column ${h.col + 1}`;
}
