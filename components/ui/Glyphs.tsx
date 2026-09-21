import type { ScenarioCategory } from "@/lib/scenario-categories";

/**
 * Line glyphs (currentColor, 24×24) for the trainer categories and a few
 * site-wide marks. Kept as plain SVG so they inherit the text colour.
 */
const P: Record<ScenarioCategory | "puzzle" | "daily" | "trainer" | "lab" | "guides", React.ReactNode> = {
  econ: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.5h3.2a1.6 1.6 0 0 1 0 3.2h-1.4a1.6 1.6 0 0 0 0 3.2h3.2" />
    </>
  ),
  "level-timing": (
    <>
      <path d="M5 19h14" />
      <path d="M7 15l5-5 5 5" />
      <path d="M7 9l5-5 5 5" />
    </>
  ),
  augment: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
      <path d="M12 8l1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2z" />
    </>
  ),
  items: (
    <>
      <path d="M4 20l6-6" />
      <path d="M8 16l-2-2 9.5-9.5L19 4l-.5 3.5L9 17z" />
      <path d="M13 11l3 3" />
    </>
  ),
  positioning: (
    <>
      <path d="M8 4l3.5 2v4L8 12l-3.5-2V6z" />
      <path d="M16 4l3.5 2v4L16 12l-3.5-2V6z" />
      <path d="M12 12l3.5 2v4L12 20l-3.5-2v-4z" />
    </>
  ),
  pivot: (
    <>
      <path d="M4 18c6 0 6-12 12-12" />
      <path d="M4 6c6 0 6 12 12 12" />
      <path d="M13 3l3 3-3 3" />
      <path d="M13 15l3 3-3 3" />
    </>
  ),
  carousel: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="4.5" r="1.4" fill="currentColor" />
      <circle cx="19" cy="9" r="1.4" fill="currentColor" />
      <circle cx="17" cy="18" r="1.4" fill="currentColor" />
      <circle cx="7" cy="18" r="1.4" fill="currentColor" />
      <circle cx="5" cy="9" r="1.4" fill="currentColor" />
    </>
  ),
  scouting: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "hp-management": (
    <>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
      <path d="M7 12h3l1.5-2.5 2 5L15 12h2" />
    </>
  ),
  endgame: (
    <>
      <path d="M4 18h16" />
      <path d="M5 15l-1-8 5 4 3-6 3 6 5-4-1 8z" />
    </>
  ),
  puzzle: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
      <path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.6-2.5 2-2.5 3.5" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
    </>
  ),
  daily: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="1" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      <path d="M9 14l2 2 4-4" />
    </>
  ),
  trainer: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  guides: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 18V5.5M8 7h8M8 10.5h6" />
    </>
  ),
};

export type GlyphName = keyof typeof P;

export function Glyph({ name, size = 20, className = "", strokeWidth = 1.6 }: { name: GlyphName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {P[name]}
    </svg>
  );
}

/** Small hexagonal logo mark for the header. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <polygon points="12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7" fill="var(--bg-raised)" stroke="var(--gold)" strokeWidth="1.2" />
      <polygon points="12,6 17,9 17,15 12,18 7,15 7,9" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--teal)" />
    </svg>
  );
}
