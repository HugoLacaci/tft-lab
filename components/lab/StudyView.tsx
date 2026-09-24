"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtStamp, parseStamp, youtubeThumb, youtubeWatchUrl, type Study } from "@/lib/study-schema";
import { lessonById } from "@/lib/curriculum";
import { readJson, writeJson } from "@/lib/storage";
import { Panel } from "@/components/ui/Panel";
import { Glyph } from "@/components/ui/Glyphs";

/**
 * A study: the VOD (click-to-load, privacy-enhanced embed), the stage-by-stage
 * guide that seeks the player, questions with hidden answers, and the player's
 * own timestamped notes (localStorage tftlab.study-notes.v1).
 */
interface Note {
  at: number;
  text: string;
  created: number;
}
interface NotesStore {
  version: 1;
  byStudy: Record<string, Note[]>;
}
const NOTES_KEY = "tftlab.study-notes.v1";

export function StudyView({ study, compNames }: { study: Study; compNames: Record<string, string> }) {
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const frame = useRef<HTMLIFrameElement | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const st = readJson<NotesStore | null>(NOTES_KEY, null);
    if (st?.version === 1) setNotes(st.byStudy[study.id] ?? []);
  }, [study.id]);

  const saveNotes = (list: Note[]) => {
    setNotes(list);
    const st = readJson<NotesStore | null>(NOTES_KEY, null) ?? { version: 1 as const, byStudy: {} };
    st.byStudy[study.id] = list;
    writeJson(NOTES_KEY, st);
  };

  // The embed reports currentTime through postMessage once we ask it to.
  useEffect(() => {
    if (!loaded) return;
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string" || !e.data.startsWith("{")) return;
      try {
        const d = JSON.parse(e.data) as { event?: string; info?: { currentTime?: number } };
        if (d.event === "infoDelivery" && typeof d.info?.currentTime === "number") setCurrent(d.info.currentTime);
        if (d.event === "onReady") frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
      } catch {
        /* not ours */
      }
    };
    window.addEventListener("message", onMsg);
    const t = setInterval(() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*"), 2000);
    return () => {
      window.removeEventListener("message", onMsg);
      clearInterval(t);
    };
  }, [loaded]);

  const command = useCallback((func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const [startAt, setStartAt] = useState(0);
  const seek = (sec: number) => {
    if (!loaded) {
      setStartAt(sec);
      setLoaded(true);
      return;
    }
    command("seekTo", [sec, true]);
    command("playVideo");
    setCurrent(sec);
  };

  const embedSrc = `https://www.youtube-nocookie.com/embed/${study.video.id}?enablejsapi=1&autoplay=1&rel=0&start=${Math.floor(startAt)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;

  const stamped = useMemo(() => study.timeline.map((t) => ({ ...t, sec: t.at ? parseStamp(t.at) : null })), [study.timeline]);
  // The item whose timestamp is the last one at or before the current time.
  const activeIdx = useMemo(() => {
    let best = -1;
    stamped.forEach((t, i) => {
      if (t.sec !== null && t.sec <= current + 0.5) best = i;
    });
    return best;
  }, [stamped, current]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    saveNotes([...notes, { at: Math.floor(current), text, created: Date.now() }].sort((a, b) => a.at - b.at));
    setDraft("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-4">
        <div className="panel overflow-hidden p-1">
          <div className="relative aspect-video w-full bg-black">
            {loaded ? (
              <iframe
                ref={frame}
                src={embedSrc}
                title={study.video.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button type="button" className="group absolute inset-0 flex h-full w-full items-center justify-center" onClick={() => setLoaded(true)} aria-label={`Play ${study.video.title} on YouTube`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, images are unoptimized anyway */}
                <img src={youtubeThumb(study.video.id)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100" loading="lazy" />
                <span className="relative flex items-center gap-2 border border-gold bg-[color-mix(in_srgb,var(--bg-deep)_85%,transparent)] px-4 py-2 text-sm text-gold-bright">
                  <Glyph name="arrow" size={16} />
                  Play the VOD ({study.video.length})
                </span>
                <span className="absolute bottom-2 left-2 right-2 text-[0.65rem] text-dim">Loads the video from YouTube (privacy-enhanced embed) only when you press play.</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-dim">
          <a href={youtubeWatchUrl(study.video.id)} target="_blank" rel="noopener noreferrer">
            Open on YouTube ↗
          </a>{" "}
          · {study.video.channel} · published {study.video.publishedOn}
          {loaded ? ` · now at ${fmtStamp(current)}` : ""}
        </p>

        <Panel as="section" aria-label="Study guide">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Stage by stage</div>
          <p className="mt-1 text-xs text-dim">Click a timestamp to jump the video there. Items without a timestamp mark a stage to watch for. Answer each question before the video does.</p>
          <ol className="mt-4 space-y-3">
            {stamped.map((t, i) => {
              const lesson = t.lesson ? lessonById(t.lesson) : undefined;
              const active = i === activeIdx;
              return (
                <li key={i} className={`timeline-item ${active ? "timeline-active" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.sec !== null ? (
                      <button type="button" className="chip chip-active tabular-nums" onClick={() => seek(t.sec!)} aria-label={`Jump to ${t.at}`}>
                        ▶ {t.at}
                      </button>
                    ) : null}
                    <span className="chip">stage {t.stage}</span>
                    <span className="display text-sm text-gold-bright">{t.title}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{t.watch}</p>
                  <p className="mt-1 text-xs text-dim">
                    <span className="text-gold">Why it matters:</span> {t.why}
                  </p>
                  {t.question ? (
                    <p className="mt-1 text-xs text-gold-bright">
                      <span className="text-gold">Ask yourself:</span> {t.question}
                    </p>
                  ) : null}
                  {t.guideLink || lesson ? (
                    <p className="mt-1 flex flex-wrap gap-3 text-xs">
                      {t.guideLink ? <Link href={t.guideLink}>Guide section →</Link> : null}
                      {lesson ? <Link href={`/trainer/path/${lesson.id}`}>Drill it: {lesson.title} →</Link> : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel as="section" aria-label="About this game">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">What this game teaches</div>
          <p className="mt-2 text-sm leading-relaxed">{study.thesis}</p>
          {study.comps.length ? (
            <p className="mt-3 text-xs text-dim">
              Comp on the tier list:{" "}
              {study.comps.map((c, i) => (
                <span key={c}>
                  {i ? " · " : ""}
                  <Link href={`/set/comps/#comp-${c}`}>{compNames[c] ?? c}</Link>
                </span>
              ))}
            </p>
          ) : null}
        </Panel>

        <Panel as="section" aria-label="Questions">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Before you watch the ending</div>
          <ul className="mt-2 space-y-2">
            {study.questions.map((qa, i) => (
              <li key={i} className="text-sm">
                <button type="button" className="text-left text-gold-bright hover:underline" aria-expanded={!!open[i]} onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
                  {open[i] ? "▾" : "▸"} {qa.q}
                </button>
                {open[i] ? <p className="mt-1 border-l border-[var(--gold-dim)] pl-3 text-xs text-dim">{qa.a}</p> : null}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel as="section" aria-label="Your notes">
          <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">Your notes</div>
          <p className="mt-1 text-xs text-dim">Write what the player did that you would not have done. The note is stamped with the video time. Stored in this browser only.</p>
          <div className="mt-2 flex gap-2">
            <input className="min-w-0 flex-1 border border-[var(--gold-dim)] bg-[var(--bg-raised)] p-2 text-sm text-ink" placeholder={`Note at ${fmtStamp(current)}…`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} maxLength={280} aria-label="New note" />
            <button type="button" className="btn btn-sm" onClick={addNote} disabled={!draft.trim()}>
              Add
            </button>
          </div>
          {notes.length ? (
            <ul className="mt-3 space-y-1.5">
              {notes.map((n) => (
                <li key={n.created} className="flex items-start gap-2 text-sm">
                  <button type="button" className="chip tabular-nums" onClick={() => seek(n.at)}>
                    {fmtStamp(n.at)}
                  </button>
                  <span className="min-w-0 flex-1">{n.text}</span>
                  <button type="button" className="text-xs text-dim hover:text-danger" aria-label="Delete note" onClick={() => saveNotes(notes.filter((x) => x.created !== n.created))}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <p className="text-[0.7rem] text-dim">{study.sourceNote} Video and title belong to {study.video.channel}; TFT Lab links to it and adds the study guide. Checked {study.verifiedOn}.</p>
      </div>
    </div>
  );
}
