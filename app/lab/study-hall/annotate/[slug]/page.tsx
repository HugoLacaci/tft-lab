import Link from "next/link";
import { notFound } from "next/navigation";
import { TimelineEditor, type EditorCatalog } from "@/components/lab/TimelineEditor";
import { loadStudies, studyById } from "@/lib/studies";
import { timelineForStudy } from "@/lib/timelines-server";
import { itemLookup, traitLookup, unitLookup, loadSetData } from "@/lib/set-data";
import { CURRENT_SET } from "@/lib/current-set";
import { livePatch } from "@/lib/live-patch";
import { getConstants } from "@/data/constants";

export function generateStaticParams() {
  return loadStudies().map((s) => ({ slug: s.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = studyById(slug);
  return { title: s ? `Annotate · ${s.title}` : "Annotate", robots: { index: false } };
}

export default async function AnnotatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = studyById(slug);
  if (!study) notFound();
  const set = loadSetData();
  const k = getConstants();
  const catalog: EditorCatalog = {
    setNumber: CURRENT_SET.setNumber,
    patch: livePatch().label,
    units: unitLookup(),
    items: Object.fromEntries(Object.entries(itemLookup()).filter(([, i]) => i.kind === "component" || i.kind === "completed" || i.kind === "emblem" || i.kind === "artifact" || i.kind === "radiant")),
    traitNames: Object.fromEntries(Object.values(traitLookup()).map((t) => [t.id, t.name])),
    augments: (set?.augments ?? []).map((a) => ({ id: a.id, name: a.name, tier: a.tier, icon: a.icon })),
    recipes: Object.fromEntries((set?.items ?? []).filter((i) => i.composition.length === 2).map((i) => [i.id, i.composition])),
    xpToLevel: k.xpToLevel,
    interest: k.interest,
    xpPerPurchase: k.xpPerPurchase,
    passiveXp: k.passiveXp,
  };
  const existing = timelineForStudy(study.id);
  return (
    <div>
      <div className="mb-6">
        <Link href={`/lab/study-hall/${study.id}`} className="text-xs">
          ← {study.title}
        </Link>
        <div className="display mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">Annotation editor · {study.player.name}</div>
        <h1 className="text-2xl sm:text-3xl">Annotate: {study.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-dim">
          Record the game as a timeline of exact states while the video plays: two states per round (start with the shop, end with the final board). The accounting equation runs as you type, so a misread gold value or a forgotten buy shows up as a residual right away. Export writes the JSON that goes into the repo; nothing is uploaded.
        </p>
      </div>
      <TimelineEditor study={study} catalog={catalog} initial={existing} />
    </div>
  );
}
