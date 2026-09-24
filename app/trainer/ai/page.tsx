import Link from "next/link";
import { AiDrills } from "@/components/trainer/AiDrills";
import { CURRENT_SET } from "@/lib/current-set";
import { guideSlugs, headings, readGuide } from "@/lib/guide-sections";
import { itemLookup, traitLookup, unitLookup } from "@/lib/set-data";
import { GENERIC_ITEMS, GENERIC_UNITS } from "@/data/archetypes";
import { getConstants } from "@/data/constants";
import { loadScenarios } from "@/lib/scenarios";
import type { Catalogue } from "@/lib/ai-drills";

export const metadata = {
  title: "Drills made for you",
  description: "An AI coach writes new drills for your exact weak spots on the live set, validated with the same rules as every other drill on the site.",
};

export default function AiPage() {
  const anchors: string[] = [];
  for (const slug of guideSlugs()) {
    const g = readGuide(slug);
    if (!g) continue;
    for (const h of headings(g.content)) if (h.depth === 2) anchors.push(`/guides/${slug}#${h.slug}`);
  }
  const items = Object.fromEntries(Object.entries(itemLookup()).filter(([, i]) => i.kind === "component" || i.kind === "completed" || i.kind === "emblem"));
  const catalogue: Catalogue = {
    setNumber: CURRENT_SET.setNumber,
    units: { ...GENERIC_UNITS, ...unitLookup() },
    items: { ...GENERIC_ITEMS, ...items },
    traitNames: Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name])),
    guideAnchors: anchors,
  };
  const k = getConstants();
  const xpNeeded = Object.fromEntries(k.xpToLevel.map((r) => [r.level, r.xp]));
  return (
    <div>
      <div className="mb-6">
        <Link href="/trainer" className="text-xs">
          ← Trainer
        </Link>
        <h1 className="text-2xl sm:text-3xl">Drills made for you</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">
          An AI coach reads your trainer progress (weakest categories, recent misses), writes new drills on the live set that attack exactly those gaps, and every drill is checked against the same rules as the hand-written ones before it reaches the board. Generated drills are saved in this browser and count toward your progress like any other.
        </p>
      </div>
      <AiDrills catalogue={catalogue} xpNeeded={xpNeeded} library={loadScenarios().map((s) => ({ id: s.id, category: s.category, prompt: s.prompt, principle: s.principle }))} />
    </div>
  );
}
