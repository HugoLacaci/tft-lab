import Link from "next/link";
import { notFound } from "next/navigation";
import { Session } from "@/components/trainer/Session";
import { LessonGate } from "@/components/trainer/LessonGate";
import { Legend, type LegendName } from "@/components/ui/Legend";
import { Glyph } from "@/components/ui/Glyphs";
import { RankEmblem } from "@/components/ui/RankEmblem";
import { LESSONS, lessonById, moduleById, nextLessonAfter, previousLesson } from "@/lib/curriculum";
import { CATEGORY_LABELS } from "@/lib/scenario-categories";
import { tierByLevel } from "@/lib/rank-tiers";
import { lessonScenarioIds, scenariosByLesson } from "@/lib/lessons-server";
import { buildSessionData } from "@/lib/trainer-server";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  const l = lessonById(lesson);
  return { title: l ? `${l.title} · lesson` : "Lesson", description: l?.blurb };
}

export default async function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: id } = await params;
  const lesson = lessonById(id);
  if (!lesson) notFound();
  const mod = moduleById(lesson.module)!;
  const tier = tierByLevel(mod.tier);
  const scenarios = scenariosByLesson(lesson.id);
  const { data, rendered } = await buildSessionData(scenarios);
  const prev = previousLesson(lesson.id);
  const next = nextLessonAfter(lesson.id);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Legend name={mod.legend as LegendName} size={64} tint={mod.color} glow={`color-mix(in srgb, ${mod.color} 45%, transparent)`} />
        <div className="min-w-0 flex-1">
          <Link href="/trainer/path" className="text-xs">
            ← Learning path
          </Link>
          <div className="display mt-1 text-[0.65rem] uppercase tracking-[0.2em]" style={{ color: mod.color }}>
            {mod.title} · lesson {lesson.order}
          </div>
          <h1 className="text-2xl sm:text-3xl">{lesson.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">{lesson.intro}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">
              <Glyph name={lesson.category} size={12} />
              {CATEGORY_LABELS[lesson.category]}
            </span>
            <span className="chip" style={{ color: tier.color, borderColor: tier.color }}>
              <RankEmblem tier={tier} size={13} />
              {tier.short}
            </span>
            <span className="chip">{scenarios.length} drills</span>
            <Link href={lesson.guideLink} className="btn btn-sm">
              Read the guide section first
            </Link>
          </div>
        </div>
        <ul className="w-full text-xs text-dim sm:w-64">
          <li className="display mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold">After this lesson you can</li>
          {lesson.outcomes.map((o) => (
            <li key={o} className="flex gap-2 py-0.5">
              <Glyph name="check" size={12} className="mt-0.5 shrink-0 text-teal" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>
      <LessonGate lesson={lesson} lessonIds={lessonScenarioIds()}>
        <Session data={data} rendered={rendered} mode="lesson" title={lesson.title} lesson={lesson} nextLesson={next ? { id: next.id, title: next.title } : null} />
      </LessonGate>
      <nav className="mt-8 flex flex-wrap justify-between gap-2 text-xs" aria-label="Neighbouring lessons">
        {prev ? (
          <Link href={`/trainer/path/${prev.id}`} className="btn btn-sm">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/trainer/path/${next.id}`} className="btn btn-sm">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
