import type { ReactNode } from "react";

const STYLES = {
  leak: { label: "Leak", color: "var(--red)" },
  tip: { label: "Tip", color: "var(--teal)" },
  math: { label: "Math", color: "var(--gold)" },
  note: { label: "Note", color: "var(--text-dim)" },
} as const;

export function Callout({ type = "note", title, children }: { type?: keyof typeof STYLES; title?: string; children: ReactNode }) {
  const s = STYLES[type] ?? STYLES.note;
  return (
    <aside className="panel my-6 p-4" style={{ borderLeft: `3px solid ${s.color}` }}>
      <div className="display mb-1 text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: s.color }}>
        {s.label}
        {title ? <span className="ml-2 normal-case tracking-normal text-gold-bright">· {title}</span> : null}
      </div>
      <div className="text-sm [&>p+p]:mt-2">{children}</div>
    </aside>
  );
}
