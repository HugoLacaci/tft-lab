import { PageTitle } from "@/components/ui/Panel";
import { EconSimulator } from "@/components/lab/EconSimulator";
import { getConstants } from "@/data/constants";

export const metadata = { title: "Econ simulator" };

export default function EconPage() {
  const k = getConstants();
  return (
    <div>
      <PageTitle lede="Project gold and level over the next five rounds under two plans, side by side. Assumes the streak continues, every round pays income, and the constants below.">
        Econ simulator
      </PageTitle>
      <EconSimulator
        k={{ baseIncome: k.baseIncome, interest: k.interest, streakGold: k.streakGold, xpToLevel: k.xpToLevel, passiveXp: k.passiveXp, xpPerPurchase: k.xpPerPurchase }}
        verifiedOn={k.verifiedOn}
        source={k.sources.interest}
      />
    </div>
  );
}
