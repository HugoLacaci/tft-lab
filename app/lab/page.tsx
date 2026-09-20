import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui/Panel";

const TOOLS = [
  { href: "/lab/odds", title: "Roll-odds calculator", body: "How likely are you to hit 2★ or 3★ on a unit given your level, the pool and your gold? Closed-form per slot, Monte-Carlo for the distribution." },
  { href: "/lab/econ", title: "Econ simulator", body: "Project gold and level over the next five rounds under two plans side by side: save, level, or roll." },
  { href: "/lab/cheatsheet", title: "Printable cheat sheet", body: "Odds, interest, level timings, item matrix and the scout routine on one page. Prints in black and white." },
  { href: "/lab/board", title: "Team planner & fight simulator", body: "Build a board with every champion, item and augment of the set, set an enemy board opposite it, and simulate the fight: win rate, survivors, damage per unit." },
];

export default function LabPage() {
  return (
    <div>
      <PageTitle lede="Small tools that answer a numeric question quickly, so the decision in the game is about the situation and not the arithmetic.">Lab</PageTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Panel key={t.href} as="article">
            <h2 className="text-lg">
              <Link href={t.href} className="text-gold-bright">
                {t.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-dim">{t.body}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
