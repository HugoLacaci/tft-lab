import Link from "next/link";
import { notFound } from "next/navigation";
import { Session } from "@/components/trainer/Session";
import { CATEGORY_BLURBS, CATEGORY_GUIDE, CATEGORY_LABELS, SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenario-categories";
import { scenariosByCategory } from "@/lib/scenarios";
import { buildSessionData } from "@/lib/trainer-server";

export function generateStaticParams() {
  return SCENARIO_CATEGORIES.map((category) => ({ category }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return { title: `${CATEGORY_LABELS[category as ScenarioCategory] ?? "Trainer"} drills` };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!SCENARIO_CATEGORIES.includes(category as ScenarioCategory)) notFound();
  const cat = category as ScenarioCategory;
  const { data, rendered } = await buildSessionData(scenariosByCategory(cat));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <Link href="/trainer" className="text-xs">
            ← Trainer
          </Link>
          <h1 className="text-2xl sm:text-3xl">{CATEGORY_LABELS[cat]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">{CATEGORY_BLURBS[cat]}</p>
        </div>
        <Link href={CATEGORY_GUIDE[cat]} className="btn btn-sm ml-auto">
          Read the guide
        </Link>
      </div>
      <Session data={data} rendered={rendered} mode="category" title={CATEGORY_LABELS[cat]} />
    </div>
  );
}
