import { PageTitle } from "@/components/ui/Panel";
import { OddsCalculator } from "@/components/lab/OddsCalculator";
import { getConstants } from "@/data/constants";

export const metadata = { title: "Roll-odds calculator" };

export default function OddsPage() {
  const k = getConstants();
  return (
    <div>
      <PageTitle lede="How likely are you to hit? Each shop slot is an independent draw weighted by your level's tier odds and by how much of the tier is still in the pool. The closed form is exact for one slot; the distribution comes from 10,000 simulated rolldowns that deplete the pool as you buy.">
        Roll-odds calculator
      </PageTitle>
      <OddsCalculator
        shopOdds={k.shopOdds}
        poolSize={k.poolSize}
        distinctChampions={k.distinctChampions}
        verifiedOn={k.verifiedOn}
        source={k.sources.shopOdds}
        stale={k.stale}
      />
    </div>
  );
}
