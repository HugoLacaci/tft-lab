import { z } from "zod";
import { LESSON_IDS } from "./curriculum";

/**
 * Study Hall entries: one real VOD (a pro's or streamer's game) plus a
 * stage-by-stage study guide written by TFT Lab: what to watch at each point,
 * why it matters, the guide section and the lesson it connects to. Files live
 * in content/studies/<slug>.json and are validated at build time.
 *
 * Timestamps (`at`, "m:ss" or "h:mm:ss") come from the creator's own chapters
 * or description where they exist; an item without `at` is anchored to a
 * stage only. Pure module (no node:fs) so client components can import it.
 */
const Stamp = z.string().regex(/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/, 'time like "12:05" or "1:43:38"');

export const StudyVideoSchema = z.object({
  platform: z.literal("youtube"),
  /** 11-char YouTube id */
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(4),
  channel: z.string().min(1),
  channelUrl: z.string().url(),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  length: Stamp,
});

export const TimelineItemSchema = z.object({
  at: Stamp.optional(),
  /** "2-1", "3", "stage 4"… free text, short */
  stage: z.string().min(1).max(24),
  title: z.string().min(4).max(90),
  /** What to look at on screen. */
  watch: z.string().min(40),
  /** The principle behind it, one or two sentences. */
  why: z.string().min(20),
  guideLink: z.string().regex(/^\/guides\/[a-z-]+(#[a-z0-9-]+)?$/).optional(),
  lesson: z.string().optional(),
  /** A question to answer before the video does. */
  question: z.string().optional(),
});

export const StudySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(6).max(90),
    video: StudyVideoSchema,
    player: z.object({
      name: z.string().min(1),
      role: z.enum(["pro", "streamer", "riot"]),
      /** One line: who this is and why they are worth watching. */
      about: z.string().min(20),
    }),
    /** TFT patch the game was played on, when known ("18.1", "PBE"). */
    patch: z.string().optional(),
    set: z.number().int().positive().optional(),
    /** Short name of the line played. */
    line: z.string().min(3).max(60),
    /** Curated comp ids (content/sets/<n>/comps.json) this game maps to. */
    comps: z.array(z.string()).default([]),
    tags: z.array(z.string()).min(1).max(6),
    /** Rank tier this study is most useful for (lib/rank-tiers.ts). */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    /** Facts from the title/description: what the game is. */
    summary: z.string().min(60),
    /** What the game teaches, in one paragraph. */
    thesis: z.string().min(80),
    timeline: z.array(TimelineItemSchema).min(4),
    questions: z.array(z.object({ q: z.string().min(10), a: z.string().min(20) })).min(2),
    /** Where the facts come from and what is TFT Lab's reading. */
    sourceNote: z.string().min(20),
    verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((s, ctx) => {
    let last = -1;
    s.timeline.forEach((t, i) => {
      if (t.lesson && !LESSON_IDS.includes(t.lesson)) ctx.addIssue({ code: "custom", path: ["timeline", i, "lesson"], message: `unknown lesson "${t.lesson}"` });
      if (t.at) {
        const sec = parseStamp(t.at);
        if (sec < last) ctx.addIssue({ code: "custom", path: ["timeline", i, "at"], message: "timestamps must not go backwards" });
        last = sec;
      }
    });
  });

export type Study = z.infer<typeof StudySchema>;
export type TimelineItem = z.infer<typeof TimelineItemSchema>;

/** "1:43:38" → seconds. */
export function parseStamp(s: string): number {
  const parts = s.split(":").map(Number);
  return parts.reduce((a, b) => a * 60 + b, 0);
}

export function fmtStamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + `:${String(r).padStart(2, "0")}`;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string, at?: number): string {
  return `https://www.youtube.com/watch?v=${id}${at ? `&t=${Math.floor(at)}s` : ""}`;
}

export const STUDY_TAGS: Record<string, string> = {
  "fast-9": "Fast 9",
  reroll: "Reroll",
  flex: "Flex play",
  augments: "Augments",
  econ: "Economy",
  positioning: "Positioning",
  tempo: "Tempo",
  vertical: "Vertical trait",
  tournament: "Tournament",
  scouting: "Scouting",
  items: "Items",
  "loss-streak": "Loss streak",
  "win-streak": "Win streak",
  wisps: "Wisps",
};
