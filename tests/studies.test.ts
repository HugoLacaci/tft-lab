import { describe, expect, it } from "vitest";
import { StudySchema, fmtStamp, parseStamp } from "@/lib/study-schema";

const base = {
  id: "x-study",
  title: "A fast 9 game worth studying",
  video: { platform: "youtube", id: "0-g2ViuVops", title: "Some title", channel: "Someone", channelUrl: "https://www.youtube.com/@someone", publishedOn: "2026-08-17", length: "26:22" },
  player: { name: "Someone", role: "pro", about: "A player worth watching for tempo decisions." },
  line: "Fast 9 flex",
  tags: ["fast-9"],
  tier: 3,
  summary: "A win-streak into level 9 game on the PBE, with two named augments and a flexible board.",
  thesis: "The game shows how a strong early board turns into econ and how the level-9 board is chosen from what the shop offers rather than a preset comp.",
  timeline: [
    { at: "0:38", stage: "2-1", title: "First augment", watch: "Which of the three augments he takes and what the board looks like when he takes it.", why: "Augments are evaluated against the board, not in a vacuum." },
    { stage: "3-2", title: "Level six", watch: "Whether he levels before or after rolling, and how much gold is left after the level.", why: "Levelling and rolling in the same round is usually wrong." },
    { at: "9:45", stage: "4-1", title: "Rolldown", watch: "The stop condition: how much gold he keeps and what he was looking for before the first roll.", why: "A rolldown is a plan with a stop, not a reflex." },
    { at: "17:36", stage: "5-1", title: "Capping", watch: "Which unit gets the ninth slot and whether items move.", why: "Gold turns into placement by two-starring carries before adding five-costs." },
  ],
  questions: [{ q: "Why does he level at 4-1 instead of rolling?", a: "Because at level 7 the odds of the units he needs double and the streak keeps paying." }, { q: "What would you have slammed at 3-2?", a: "The two completed items on the units already on the board, not the perfect ones for a carry not yet found." }],
  sourceNote: "Facts from the video title and description; the guide is TFT Lab's reading.",
  verifiedOn: "2026-09-24",
};

describe("study schema", () => {
  it("parses a valid study and rejects backwards timestamps and unknown lessons", () => {
    expect(StudySchema.safeParse(base).success).toBe(true);
    const back = { ...base, timeline: [base.timeline[0], { ...base.timeline[2], at: "0:10" }, base.timeline[1], base.timeline[3]] };
    expect(StudySchema.safeParse(back).success).toBe(false);
    const badLesson = { ...base, timeline: base.timeline.map((t, i) => (i === 0 ? { ...t, lesson: "nope" } : t)) };
    expect(StudySchema.safeParse(badLesson).success).toBe(false);
    expect(StudySchema.safeParse({ ...base, video: { ...base.video, id: "short" } }).success).toBe(false);
  });
  it("parses and formats timestamps", () => {
    expect(parseStamp("0:38")).toBe(38);
    expect(parseStamp("1:43:38")).toBe(6218);
    expect(fmtStamp(6218)).toBe("1:43:38");
    expect(fmtStamp(65)).toBe("1:05");
  });
});
