import type { CSSProperties, ReactNode } from "react";

export function Panel({
  children,
  className = "",
  as: Tag = "div",
  raised = false,
  style,
  glow,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  raised?: boolean;
  style?: CSSProperties;
  /** Colour of a soft line glowing along the top edge (rank tiers, hero). */
  glow?: string;
  "aria-live"?: "polite" | "assertive" | "off";
  "aria-label"?: string;
}) {
  return (
    <Tag className={`panel ${raised ? "panel-raised" : ""} ${glow ? "panel-glow" : ""} p-4 sm:p-5 ${className}`} style={glow ? ({ ...style, ["--panel-glow" as string]: glow } as CSSProperties) : style} {...rest}>
      {glow ? <span className="panel-glow-line" aria-hidden /> : null}
      {children}
    </Tag>
  );
}

export function SectionTitle({
  children,
  kicker,
  className = "",
}: {
  children: ReactNode;
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {kicker ? <div className="display text-[0.7rem] uppercase tracking-[0.2em] text-gold">{kicker}</div> : null}
      <h2 className="text-xl sm:text-2xl">{children}</h2>
      <div className="gold-rule mt-2 max-w-xs" />
    </div>
  );
}

export function PageTitle({ children, lede, aside }: { children: ReactNode; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <h1 className="rise text-2xl sm:text-3xl md:text-4xl">{children}</h1>
        {lede ? (
          <p className="rise mt-3 max-w-2xl text-dim" style={{ ["--i" as string]: 1 } as CSSProperties}>
            {lede}
          </p>
        ) : null}
        <div className="gold-rule gold-rule-shine mt-4 max-w-md" />
      </div>
      {aside ? <div className="hidden shrink-0 sm:block">{aside}</div> : null}
    </div>
  );
}
