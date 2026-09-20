import { PageTitle } from "@/components/ui/Panel";
import { TrainerHome } from "@/components/trainer/TrainerHome";
import { categoryCounts } from "@/lib/scenarios";

export const metadata = { title: "Trainer" };

export default function TrainerPage() {
  return (
    <div>
      <PageTitle lede="Decision drills on a real board. You make the call, you get scored, you read why. Missed drills come back after 1, 3 and 7 days until they stick.">
        Trainer
      </PageTitle>
      <TrainerHome counts={categoryCounts()} />
    </div>
  );
}
