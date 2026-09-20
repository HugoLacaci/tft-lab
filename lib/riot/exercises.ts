/**
 * Personalised drills built from the player's own games. Each template fires
 * on a pattern in the data and produces a multiple-choice question with the
 * real numbers from that game in the prompt. Pure; graded in the UI.
 */
import type { ScenarioCategory } from "../scenario-categories";
import { CATEGORY_GUIDE } from "../scenario-categories";
import { completedItemsOf, expectedLevel, type Report, type RiotGame } from "./analyze";

export interface Exercise {
  id: string;
  category: ScenarioCategory;
  title: string;
  prompt: string;
  options: { id: string; label: string }[];
  correct: string;
  explanation: string;
  guide: string;
  matchId?: string;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function buildExercises(games: RiotGame[], report: Report, ctx: { componentIds: Set<string>; unitName: (id: string) => string; traitName: (id: string) => string }): Exercise[] {
  const out: Exercise[] = [];
  const sorted = [...games].sort((a, b) => b.at.localeCompare(a.at));
  const bottom = sorted.filter((g) => g.placement >= 5);
  const add = (e: Exercise) => {
    if (!out.some((x) => x.id === e.id)) out.push(e);
  };

  // 1. econ: died with gold
  const rich = bottom.find((g) => g.goldLeft >= 20);
  if (rich) {
    const under = rich.level < expectedLevel(rich.lastRound);
    add({
      id: `econ:${rich.matchId}`,
      matchId: rich.matchId,
      category: "econ",
      title: "Gold in the bank at elimination",
      prompt: `On ${rich.at.slice(0, 10)} you went ${rich.placement}th at ${rich.stage}, level ${rich.level}, with ${rich.goldLeft} gold unspent. Two rounds earlier, at roughly the same HP, what was the right call?`,
      options: [
        { id: "hold", label: "Keep 50 for interest; the board just needed one more upgrade to hit" },
        { id: "level", label: `Level up${under ? " (you were below the standard timing)" : ""}, then roll to stabilise` },
        { id: "roll", label: "Roll everything at the current level for 2★s" },
        { id: "sell", label: "Sell the board and reroll for a different comp" },
      ],
      correct: under ? "level" : "roll",
      explanation: under
        ? `You were level ${rich.level} when the standard timing says ${expectedLevel(rich.lastRound)}. Below HP threat with gold in hand, the level is the cheapest strength: it unlocks a unit slot and better odds, and the remaining gold rolls for the 2★s. Dying with ${rich.goldLeft} gold means the interest was never cashed in.`
        : `At level ${rich.level} the odds already favour your key units; with HP low, gold is only worth what it buys before the next fight. Rolling down two rounds before the death round converts ${rich.goldLeft} gold into board strength. Interest only matters if you live to collect it.`,
      guide: CATEGORY_GUIDE.econ,
    });
  }

  // 2. tempo: under-levelled vs lobby
  const slow = bottom.find((g) => g.lobby?.length && g.level < mean(g.lobby.map((x) => x.level)) - 0.75);
  if (slow) {
    const la = mean(slow.lobby!.map((x) => x.level));
    add({
      id: `tempo:${slow.matchId}`,
      matchId: slow.matchId,
      category: "level-timing",
      title: "Out-levelled by the lobby",
      prompt: `You were eliminated at ${slow.stage} at level ${slow.level}; the lobby averaged ${la.toFixed(1)}. Which standard timing did you most likely miss?`,
      options: [
        { id: "l6", label: "Level 6 at 3-2" },
        { id: "l7", label: "Level 7 at 4-1" },
        { id: "l8", label: "Level 8 at 4-2 / 4-5" },
        { id: "none", label: "None: levels do not matter if the units are 2★" },
      ],
      correct: slow.level <= 6 ? "l7" : "l8",
      explanation: `At ${slow.stage} the board should be level ${expectedLevel(slow.lastRound)}. Being ${Math.max(1, Math.round(la - slow.level))} level${la - slow.level >= 1.5 ? "s" : ""} behind the lobby means one fewer unit and worse shop odds every round; 2★s do not compensate for a missing unit and a missing trait breakpoint. Levelling at the standard rounds is the default; you deviate only with a reason (a 3★ reroll line or a huge streak).`,
      guide: CATEGORY_GUIDE["level-timing"],
    });
  }

  // 3. items: few completed items vs lobby
  const poor = bottom.find((g) => g.lobby?.length && completedItemsOf(g, ctx.componentIds) <= mean(g.lobby.map((x) => x.completedItems)) - 1.5);
  if (poor) {
    const mine = completedItemsOf(poor, ctx.componentIds);
    const li = mean(poor.lobby!.map((x) => x.completedItems));
    add({
      id: `items:${poor.matchId}`,
      matchId: poor.matchId,
      category: "items",
      title: "Item gap",
      prompt: `Your final board on ${poor.at.slice(0, 10)} had ${mine} completed items; the lobby averaged ${li.toFixed(1)}. Same drops as everyone else. Where does the gap usually come from?`,
      options: [
        { id: "hold", label: "Holding components for the perfect item on the perfect unit" },
        { id: "luck", label: "Bad item luck; nothing to change" },
        { id: "carousel", label: "Taking a unit instead of a component on carousel" },
        { id: "sell", label: "Selling itemised units when pivoting" },
      ],
      correct: "hold",
      explanation: `Everyone gets roughly the same component count. A gap of ${(li - mine).toFixed(1)} items at the end means components sat on the bench while fights were lost. Slam by 3-2 on the unit you have; a "wrong" completed item on the board is worth more than two perfect components in the bench, and most slams carry over (tank items move, AD items move).`,
      guide: CATEGORY_GUIDE.items,
    });
  }

  // 4. scouting/pivot: contested line
  const contested = bottom.find((g) => {
    const top = g.traits.filter((t) => t.style > 0).sort((a, b) => b.style * 100 + b.count - (a.style * 100 + a.count))[0];
    return top && g.lobby && g.lobby.filter((x) => x.topTraits.includes(top.id)).length >= 2;
  });
  if (contested) {
    const top = contested.traits.filter((t) => t.style > 0).sort((a, b) => b.style * 100 + b.count - (a.style * 100 + a.count))[0]!;
    const sharers = contested.lobby!.filter((x) => x.topTraits.includes(top.id));
    add({
      id: `pivot:${contested.matchId}`,
      matchId: contested.matchId,
      category: "pivot",
      title: "Contested line",
      prompt: `${ctx.traitName(top.id)} was played by you and ${sharers.length} other players (they placed ${sharers.map((x) => x.placement).join(", ")}; you ${contested.placement}th). When should the contest have changed your plan?`,
      options: [
        { id: "never", label: "Never; commit harder and hit first" },
        { id: "early", label: "At 2-1 / 3-2 scouting: two or more on the line means pivot unless you are far ahead" },
        { id: "late", label: "At 4-5 when the shop stops showing the units" },
        { id: "aug", label: "Only if an augment forces it" },
      ],
      correct: "early",
      explanation: `With ${sharers.length + 1} players on ${ctx.traitName(top.id)} the pool is split three ways; the odds of hitting collapse for everyone. The read is available at 2-1 (opening boards, items) and 3-2 (first slams). The player who pivots first to the uncontested line usually beats all of the contestants; the one who stays needs a clear head start (2★ carry, items) to justify it.`,
      guide: CATEGORY_GUIDE.pivot,
    });
  }

  // 5. endgame: top-4 but uncapped
  const uncapped = sorted.find((g) => g.placement >= 2 && g.placement <= 4 && g.units.length && g.units.filter((u) => u.star === 1).length / g.units.length >= 0.35);
  if (uncapped) {
    const ones = uncapped.units.filter((u) => u.star === 1);
    add({
      id: `cap:${uncapped.matchId}`,
      matchId: uncapped.matchId,
      category: "endgame",
      title: "Converting a top 4 into a win",
      prompt: `You went ${uncapped.placement}th with ${ones.length} 1★ units on the final board (${ones.map((u) => ctx.unitName(u.id)).join(", ")}) and ${uncapped.goldLeft} gold. With the top 4 locked, what caps the board fastest?`,
      options: [
        { id: "five", label: "Add more 1★ 5-costs for the trait breakpoints" },
        { id: "two", label: "Roll at 8/9 to 2★ the 4-costs already on the board, then add 5-costs" },
        { id: "level10", label: "Save for level 10" },
        { id: "items", label: "Move all items onto the 5-costs" },
      ],
      correct: "two",
      explanation: `A 1★ 4-cost is usually weaker than the 2★ 3-cost it replaced; a board full of 1★s loses to a capped 2★ board even with better traits. Once you are safe, gold turns into placement by 2★-ing the carries you already have (best odds at 8 for 4-costs), then adding 5-costs. Level 10 is for lobbies that go very long; ${uncapped.goldLeft} gold at the end was unused strength.`,
      guide: CATEGORY_GUIDE.endgame,
    });
  }

  // 6. hp: early death
  const early = bottom.find((g) => g.lastRound > 0 && g.lastRound <= 18);
  if (early) {
    add({
      id: `hp:${early.matchId}`,
      matchId: early.matchId,
      category: "hp-management",
      title: "Out before 4-1",
      prompt: `You were eliminated at ${early.stage} (${early.placement}th) with ${early.goldLeft} gold and ${completedItemsOf(early, ctx.componentIds)} completed items. Which stage-2/3 habit prevents this most reliably?`,
      options: [
        { id: "eco", label: "Loss-streak on purpose to 50 gold, then roll at 4-1" },
        { id: "strong", label: "Play the strongest board every round and slam two items by 3-2" },
        { id: "hold", label: "Hold components for the late-game carry" },
        { id: "level", label: "Skip levelling to save gold" },
      ],
      correct: "strong",
      explanation: `An 8th at ${early.stage} costs more LP than any econ line can win back. Stage 2 and 3 HP is protected by fielding upgrades as they come (bench 2★s go on the board), slamming the first two items on whatever front and back unit you have, and taking the win-streak when the board is strong. Intentional loss-streaks are only fine when the lobby lets you: with ${early.goldLeft} gold and an early exit, the gold never turned into a board.`,
      guide: CATEGORY_GUIDE["hp-management"],
    });
  }

  // 7. scouting: damage far below lobby in a mid placement
  const passive = sorted.find((g) => g.lobby?.length && g.placement >= 4 && g.placement <= 6 && g.damageToPlayers <= mean(g.lobby.map((x) => x.damage)) * 0.5);
  if (passive) {
    add({
      id: `scout:${passive.matchId}`,
      matchId: passive.matchId,
      category: "scouting",
      title: "A board that never won a fight",
      prompt: `You placed ${passive.placement}th dealing ${passive.damageToPlayers} player damage; the lobby averaged ${Math.round(mean(passive.lobby!.map((x) => x.damage)))}. Your board rarely won a round. Which scouting habit changes that?`,
      options: [
        { id: "none", label: "Scouting does not change fights" },
        { id: "pos", label: "Check the next opponent's carry position each round and move your threats/tank accordingly" },
        { id: "items", label: "Copy the items of the 1st-place player" },
        { id: "level", label: "Level whenever a rival levels" },
      ],
      correct: "pos",
      explanation: `Fight outcomes at equal strength are decided by positioning: where the enemy assassins land, whether your carry is in the corner their Zephyr hits, whether your tank faces their damage. Scouting the next opponent takes ten seconds and moves a coin-flip fight to 60/40. Consistently low player damage with a mid placement is the signature of fights that were losable and lost.`,
      guide: CATEGORY_GUIDE.scouting,
    });
  }

  // Order by the report's focus (weakest first), cap at 8.
  const w = (c: ScenarioCategory) => report.focus[c] ?? 0;
  return out.sort((a, b) => w(b.category) - w(a.category)).slice(0, 8);
}
