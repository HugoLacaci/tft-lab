import { PageTitle } from "@/components/ui/Panel";
import { Tracker } from "@/components/tracker/Tracker";

export const metadata = { title: "Leak tracker" };

export default function TrackerPage() {
  return (
    <div>
      <PageTitle lede="Log every game before you queue the next: placement, comp, one tagged leak, one line. The weakest category feeds the Trainer's Daily 10. Stored in this browser only; export to keep it.">
        Leak tracker
      </PageTitle>
      <Tracker />
    </div>
  );
}
