import type { HexCoord } from "./hex";
import type { PlacedUnit, Scenario } from "./scenario-schema";

/**
 * The solved board for board questions, so the explanation can SHOW the answer
 * instead of only outlining hexes: the placed unit on its (first) correct hex,
 * the two swapped units in each other's hexes, the item on its holder. Pure.
 */
export interface Solution {
  board: PlacedUnit[];
  /** Hexes to mark as "the answer". */
  marks: HexCoord[];
  /** One line under the board. */
  caption: string;
  /** Text the board cannot show (choice/ordering/augment answers). */
  text: string | null;
}

export function solutionFor(s: Scenario, names: (id: string) => string): Solution | null {
  const q = s.question;
  const board = s.state.board.map((u) => ({ ...u, items: [...u.items] }));
  switch (q.type) {
    case "placement": {
      const hex = q.correctHexes[0]!;
      board.push({ championId: q.unitId, row: hex.row, col: hex.col, star: 1, items: [] });
      const more = q.correctHexes.length > 1 ? ` (${q.correctHexes.length} hexes are accepted; all are marked)` : "";
      return { board, marks: q.correctHexes, caption: `${names(q.unitId)} goes here${more}.`, text: null };
    }
    case "swap": {
      const [a, b] = q.correctPairs[0]!;
      const ua = board.find((u) => u.championId === a);
      const ub = board.find((u) => u.championId === b);
      if (!ua || !ub) return null;
      [ua.row, ub.row] = [ub.row, ua.row];
      [ua.col, ub.col] = [ub.col, ua.col];
      return { board, marks: [{ row: ua.row, col: ua.col }, { row: ub.row, col: ub.col }], caption: `${names(a)} and ${names(b)} trade places.`, text: null };
    }
    case "item-holder": {
      const marks: HexCoord[] = [];
      for (const u of board) {
        if (q.correctUnitIds.includes(u.championId)) {
          if (u.items.length < 3) u.items.push(q.itemId);
          marks.push({ row: u.row, col: u.col });
        }
      }
      return { board, marks, caption: `${names(q.itemId)} goes on ${q.correctUnitIds.map(names).join(" or ")}.`, text: null };
    }
    case "choice": {
      const labels = q.correct.map((id) => q.options.find((o) => o.id === id)?.label ?? id);
      return { board, marks: [], caption: "", text: labels.join(" · ") };
    }
    case "augment":
      return { board, marks: [], caption: "", text: names(q.correct) };
    case "ordering":
      return { board, marks: [], caption: "", text: q.correctOrder.map((i, n) => `${n + 1}. ${q.steps[i]}`).join("\n") };
  }
}

/** Board questions get a drawn solution; the rest get text. */
export function hasBoardSolution(s: Scenario): boolean {
  return s.question.type === "placement" || s.question.type === "swap" || s.question.type === "item-holder";
}
