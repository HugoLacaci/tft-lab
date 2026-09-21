import Link from "next/link";
import { PageTitle } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";

export default function NotFound() {
  return (
    <div>
      <PageTitle lede="That page does not exist, or the set changed and the id with it." aside={<Legend name="hauntling" size={110} tint="#e0483a" glow="rgba(224,72,58,0.4)" title="Hauntling" />}>
        Not found
      </PageTitle>
      <ul className="flex flex-wrap gap-2 text-sm">
        {[
          ["/", "Home"],
          ["/set", "Set hub"],
          ["/lab/board", "Team planner"],
          ["/trainer", "Trainer"],
          ["/trainer/puzzles", "Tactics puzzles"],
          ["/tracker", "Tracker"],
        ].map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="chip hover:no-underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
