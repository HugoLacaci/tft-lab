import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  as: Tag = "div",
  raised = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  raised?: boolean;
}) {
  return <Tag className={`panel ${raised ? "panel-raised" : ""} p-4 sm:p-5 ${className}`}>{children}</Tag>;
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

export function PageTitle({ children, lede }: { children: ReactNode; lede?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl">{children}</h1>
      {lede ? <p className="mt-3 max-w-2xl text-dim">{lede}</p> : null}
      <div className="gold-rule mt-4 max-w-md" />
    </div>
  );
}
