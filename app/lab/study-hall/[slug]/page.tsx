import Link from "next/link";
import { notFound } from "next/navigation";
import { StudyView } from "@/components/lab/StudyView";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { loadStudies, studyById } from "@/lib/studies";
import { STUDY_TAGS } from "@/lib/study-schema";
import { tierByLevel } from "@/lib/rank-tiers";
import { loadComps } from "@/lib/comps";

export function generateStaticParams() {
  return loadStudies().map((s) => ({ slug: s.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = studyById(slug);
  return { title: s ? `${s.title} · Study Hall` : "Study", description: s?.summary };
}

export default async function StudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = studyById(slug);
  if (!s) notFound();
  const tier = tierByLevel(s.tier);
  const comps = loadComps();
  const compNames = Object.fromEntries((comps?.comps ?? []).map((c) => [c.id, c.name]));
  const all = loadStudies();
  const i = all.findIndex((x) => x.id === s.id);
  const prev = all[i + 1];
  const next = all[i - 1];
  return (
    <div>
      <div className="mb-6">
        <Link href="/lab/study-hall" className="text-xs">
          ← Study Hall
        </Link>
        <div className="display mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">
          {s.player.name} · {s.line}
          {s.patch ? ` · patch ${s.patch}` : ""}
        </div>
        <h1 className="text-2xl sm:text-3xl">{s.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-dim">{s.summary}</p>
        <p className="mt-1 max-w-3xl text-xs text-dim">
          <span className="text-gold">{s.player.name}:</span> {s.player.about}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="chip" style={{ color: tier.color, borderColor: tier.color }}>
            <RankEmblem tier={tier} size={12} />
            {tier.short}
          </span>
          {s.tags.map((t) => (
            <span key={t} className="chip">
              {STUDY_TAGS[t] ?? t}
            </span>
          ))}
          <span className="chip">{s.video.length}</span>
        </div>
      </div>
      <StudyView study={s} compNames={compNames} />
      <nav className="mt-8 flex flex-wrap justify-between gap-2 text-xs" aria-label="Neighbouring studies">
        {prev ? (
          <Link href={`/lab/study-hall/${prev.id}`} className="btn btn-sm">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/lab/study-hall/${next.id}`} className="btn btn-sm">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
