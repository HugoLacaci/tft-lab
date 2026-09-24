import { PageTitle } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { TrainerHome } from "@/components/trainer/TrainerHome";
import { categoryCounts, loadScenarios } from "@/lib/scenarios";
import { loadPuzzles } from "@/lib/puzzles";
import { lessonScenarioIds } from "@/lib/lessons-server";
import { RANK_TIERS, type Difficulty } from "@/lib/rank-tiers";

export const metadata = {
  title: "Trainer",
  description: "A learning path from your first game to Master-level decisions: lessons that build on each other, drills on a real board, hints, drawn solutions, spaced replays and AI-written drills for your weak spots.",
};

export default function TrainerPage() {
  const puzzles = Object.fromEntries(RANK_TIERS.map((t) => [t.level, [] as string[]])) as Record<Difficulty, string[]>;
  for (const p of loadPuzzles()) puzzles[p.difficulty].push(p.id);
  return (
    <div>
      <PageTitle
        lede="Decision drills on a real board, organised as a path: lessons that build on each other from 'what is a round' to Master-level calls. Make the call, get scored, read why. Ask for a hint, see the solution drawn on the board, replay what you missed."
        aside={<Legend name="choncc-1" size={110} title="Choncc" />}
      >
        Trainer
      </PageTitle>
      <TrainerHome counts={categoryCounts()} puzzles={puzzles} lessonIds={lessonScenarioIds()} totalDrills={loadScenarios().length} />
    </div>
  );
}
