import { PageTitle } from "@/components/ui/Panel";
import { Tracker } from "@/components/tracker/Tracker";
import { itemLookup, loadSetData, traitLookup, unitLookup } from "@/lib/set-data";

export const metadata = { title: "Game tracker" };

export default function TrackerPage() {
  const data = loadSetData();
  const traitNames = Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name]));
  const componentIds = (data?.items ?? []).filter((i) => i.kind === "component").map((i) => i.id);
  return (
    <div>
      <PageTitle lede="Pull your match history with your Riot ID and get a read on what goes well, what leaks and what to drill next; or log games by hand with one tagged leak. The weakest category feeds the Trainer's Daily 10. Everything is stored in this browser only; export to keep it.">
        Game tracker
      </PageTitle>
      <Tracker units={unitLookup()} items={itemLookup()} traitNames={traitNames} componentIds={componentIds} />
    </div>
  );
}
