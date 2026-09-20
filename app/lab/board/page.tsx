import { PageTitle } from "@/components/ui/Panel";
import { TeamPlanner, type PlannerData } from "@/components/lab/TeamPlanner";
import { loadSetData } from "@/lib/set-data";
import { CURRENT_SET } from "@/lib/current-set";
import { loadTiers, ranksById } from "@/lib/tiers";
import { loadSummons } from "@/lib/summons";

export const metadata = { title: "Team planner" };

const PLANNER_ITEM_KINDS = new Set(["component", "completed", "emblem", "artifact", "radiant", "support"]);

export default function BoardSandboxPage() {
  const data = loadSetData();
  if (!data) {
    return (
      <div>
        <PageTitle lede="Run `npm run sync-set` to load the live set; the planner needs champions, items and augments.">Team planner</PageTitle>
      </div>
    );
  }
  const tiers = loadTiers();
  const planner: PlannerData = {
    setNumber: CURRENT_SET.setNumber,
    patch: CURRENT_SET.patch,
    itemRanks: ranksById(data.items, tiers?.items),
    augmentRanks: ranksById(data.augments, tiers?.augments),
    champions: [...data.champions.map((c) => ({ ...c, ability: { ...c.ability, icon: "" } })), ...loadSummons()],
    items: data.items.filter((i) => PLANNER_ITEM_KINDS.has(i.kind)),
    traits: data.traits,
    augments: data.augments,
  };
  return (
    <div>
      <PageTitle lede="Build a board with every champion, item and augment of the live set, put an enemy board opposite it, and simulate the fight. The trait tracker updates as you place units; the result is an estimate for comparing boards, not a replay of the client.">
        Team planner
      </PageTitle>
      <TeamPlanner data={planner} />
    </div>
  );
}
