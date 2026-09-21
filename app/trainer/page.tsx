import { PageTitle } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { TrainerHome } from "@/components/trainer/TrainerHome";
import { categoryCounts } from "@/lib/scenarios";
import { loadPuzzles } from "@/lib/puzzles";
import { RANK_TIERS, type Difficulty } from "@/lib/rank-tiers";

export const metadata = { title: "Trainer" };

export default function TrainerPage() {
  const puzzles = Object.fromEntries(RANK_TIERS.map((t) => [t.level, [] as string[]])) as Record<Difficulty, string[]>;
  for (const p of loadPuzzles()) puzzles[p.difficulty].push(p.id);
  return (
    <div>
      <PageTitle
        lede="Decision drills on a real board. You make the call, you get scored, you read why. Missed drills come back after 1, 3 and 7 days until they stick."
        aside={<Legend name="choncc-1" size={110} title="Choncc" />}
      >
        Trainer
      </PageTitle>
      <TrainerHome counts={categoryCounts()} puzzles={puzzles} />
    </div>
  );
}
