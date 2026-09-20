import Link from "next/link";
import { PageTitle } from "@/components/ui/Panel";

export default function NotFound() {
  return (
    <div>
      <PageTitle lede="That page does not exist, or the set changed and the id with it.">Not found</PageTitle>
      <ul className="flex flex-wrap gap-2 text-sm">
        {[
          ["/", "Home"],
          ["/set", "Set hub"],
          ["/lab/board", "Team planner"],
          ["/trainer", "Trainer"],
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
