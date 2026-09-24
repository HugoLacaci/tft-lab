"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtStamp, youtubeThumb, youtubeWatchUrl } from "@/lib/study-schema";
import { Glyph } from "@/components/ui/Glyphs";

/**
 * Click-to-load, privacy-enhanced YouTube embed with a tiny control surface:
 * `seek` (via a request object so parents stay declarative), `onTime` with
 * the current position (polled through the IFrame postMessage API), and the
 * "now at" line. Shared by the study guide and the annotation editor.
 */
export interface SeekRequest {
  sec: number;
  /** bump to re-issue the same second */
  n: number;
}

export function StudyPlayer({ videoId, title, length, channel, publishedOn, seek, onTime }: { videoId: string; title: string; length: string; channel: string; publishedOn: string; seek?: SeekRequest | null; onTime?: (sec: number) => void }) {
  const [loaded, setLoaded] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [current, setCurrent] = useState(0);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    if (!loaded) return;
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string" || !e.data.startsWith("{")) return;
      try {
        const d = JSON.parse(e.data) as { event?: string; info?: { currentTime?: number } };
        if (d.event === "infoDelivery" && typeof d.info?.currentTime === "number") {
          setCurrent(d.info.currentTime);
          onTimeRef.current?.(d.info.currentTime);
        }
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

  const lastSeek = useRef<number>(-1);
  useEffect(() => {
    if (!seek || seek.n === lastSeek.current) return;
    lastSeek.current = seek.n;
    if (!loaded) {
      setStartAt(seek.sec);
      setLoaded(true);
      return;
    }
    command("seekTo", [seek.sec, true]);
    command("playVideo");
    setCurrent(seek.sec);
    onTimeRef.current?.(seek.sec);
  }, [seek, loaded, command]);

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&start=${Math.floor(startAt)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;

  return (
    <div>
      <div className="panel overflow-hidden p-1">
        <div className="relative aspect-video w-full bg-black">
          {loaded ? (
            <iframe ref={frame} src={embedSrc} title={title} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          ) : (
            <button type="button" className="group absolute inset-0 flex h-full w-full items-center justify-center" onClick={() => setLoaded(true)} aria-label={`Play ${title} on YouTube`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, images are unoptimized anyway */}
              <img src={youtubeThumb(videoId)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100" loading="lazy" />
              <span className="relative flex items-center gap-2 border border-gold bg-[color-mix(in_srgb,var(--bg-deep)_85%,transparent)] px-4 py-2 text-sm text-gold-bright">
                <Glyph name="arrow" size={16} />
                Play the VOD ({length})
              </span>
              <span className="absolute bottom-2 left-2 right-2 text-[0.65rem] text-dim">Loads the video from YouTube (privacy-enhanced embed) only when you press play.</span>
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-dim">
        <a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
          Open on YouTube ↗
        </a>{" "}
        · {channel} · published {publishedOn}
        {loaded ? ` · now at ${fmtStamp(current)}` : ""}
      </p>
    </div>
  );
}
