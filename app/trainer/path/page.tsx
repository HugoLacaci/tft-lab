import Link from "next/link";
import { PageTitle } from "@/components/ui/Panel";
import { Legend } from "@/components/ui/Legend";
import { PathMap, Placement } from "@/components/trainer/PathMap";
import { lessonScenarioIds, liveLessons } from "@/lib/lessons-server";
import { MODULES } from "@/lib/curriculum";

export const metadata = {
  title: "Learning path",
  description: "Five modules, from Welcome to TFT to Mastery. Each lesson is a short set of drills on a real board; pass one to open the next, or place yourself at your rank and skip ahead.",
};

export default function PathPage() {
  const ids = lessonScenarioIds();
  const lessons = liveLessons();
  const drills = Object.values(ids).reduce((a, b) => a + b.length, 0);
  return (
    <div>
      <div className="mb-2">
        <Link href="/trainer" className="text-xs">
          ← Trainer
        </Link>
      </div>
      <PageTitle
        lede={`${lessons.length} lessons in ${MODULES.length} modules, ${drills} drills. Each lesson teaches one idea, then drills it until it is a habit. Lessons open in order; pass one (70% of its drills solved) to open the next. Already play ranked? Place yourself and start where it gets hard.`}
        aside={<Legend name="pengu-3" size={110} glow="rgba(10,200,185,0.35)" tint="#0ac8b9" title="Pengu" />}
      >
        Learning path
      </PageTitle>
      <div className="mb-6">
        <Placement />
      </div>
      <PathMap lessonIds={ids} />
    </div>
  );
}
