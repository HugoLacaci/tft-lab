import Link from "next/link";
import { STUDY_TAGS, youtubeThumb, type Study } from "@/lib/study-schema";
import { tierByLevel } from "@/lib/rank-tiers";
import { RankEmblem } from "@/components/ui/RankEmblem";

/** Card on the Study Hall index: thumbnail, who, what line, how long, tags. */
export function StudyCard({ study }: { study: Study }) {
  const tier = tierByLevel(study.tier);
  return (
    <Link href={`/lab/study-hall/${study.id}`} className="study-card panel flex h-full flex-col gap-3 p-3 hover:no-underline">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, images are unoptimized anyway */}
        <img src={youtubeThumb(study.video.id)} alt="" className="study-thumb h-full w-full object-cover" loading="lazy" />
        <span className="absolute bottom-1.5 right-1.5 bg-[rgba(0,0,0,0.75)] px-1.5 py-0.5 text-[0.65rem] tabular-nums text-gold-bright">{study.video.length}</span>
        <span className="absolute left-1.5 top-1.5 chip" style={{ background: "rgba(0,0,0,0.7)" }}>
          {study.player.role === "pro" ? "pro" : study.player.role === "riot" ? "Riot" : "streamer"}
        </span>
      </div>
      <div className="min-w-0">
        <div className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">
          {study.player.name} · {study.line}
        </div>
        <div className="display mt-0.5 text-sm leading-snug text-gold-bright">{study.title}</div>
        <p className="mt-1 line-clamp-3 text-xs text-dim">{study.summary}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[0.65rem]">
        <span className="chip" style={{ color: tier.color, borderColor: tier.color }}>
          <RankEmblem tier={tier} size={11} />
          {tier.short}
        </span>
        {study.patch ? <span className="chip">patch {study.patch}</span> : null}
        {study.tags.slice(0, 3).map((t) => (
          <span key={t} className="chip">
            {STUDY_TAGS[t] ?? t}
          </span>
        ))}
        <span className="ml-auto text-dim">{study.timeline.length} stops</span>
      </div>
    </Link>
  );
}
