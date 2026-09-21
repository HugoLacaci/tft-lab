"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import type { PatchNotesFile } from "@/lib/patch-notes";
import { useMarkSeen } from "@/lib/whats-new";

/**
 * Riot's patch notes, mirrored by scripts/sync-patch-notes.ts. The HTML is
 * whitelist-sanitised at sync time (lib/patch-notes.ts#sanitizeHtml); the
 * page only picks which note to show. Opening the page marks the newest note
 * as seen in this browser (lib/whats-new.ts); notes published after the one
 * seen last time carry a NEW tag for this visit.
 */
export function PatchNotes({ data }: { data: PatchNotesFile }) {
  const [slug, setSlug] = useState(data.notes[0]!.slug);
  const note = data.notes.find((n) => n.slug === slug) ?? data.notes[0]!;
  const older = data.index.filter((i) => !data.notes.some((n) => n.slug === i.slug));
  const seenBefore = useMarkSeen("patch-notes", data.notes[0]!.slug);
  const seenAt = seenBefore ? (data.notes.find((n) => n.slug === seenBefore) ?? data.index.find((i) => i.slug === seenBefore))?.publishedAt ?? null : null;
  const isNew = (publishedAt: string) => seenBefore !== undefined && seenAt !== null && publishedAt > seenAt;
  const newCount = data.notes.filter((n) => isNew(n.publishedAt)).length;
  return (
    <div className="space-y-6">
      {newCount ? (
        <p className="pop flex items-center gap-2 text-sm text-teal" role="status">
          <span className="display border border-teal px-1 text-[0.55rem] font-bold uppercase tracking-[0.15em]">New</span>
          {newCount === 1 ? "One patch note" : `${newCount} patch notes`} published since your last visit.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="display text-[0.65rem] uppercase tracking-[0.2em] text-gold">Patch</span>
        {data.notes.map((n) => (
          <button key={n.slug} type="button" className={`chip ${n.slug === note.slug ? "chip-active" : ""}`} aria-pressed={n.slug === note.slug} onClick={() => setSlug(n.slug)} style={isNew(n.publishedAt) ? { borderColor: "var(--teal)" } : undefined}>
            {isNew(n.publishedAt) ? <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_6px_var(--teal)]" aria-label="New" /> : null}
            {n.patch ?? n.title}
            <span className="text-dim">{n.publishedAt.slice(0, 10)}</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-dim">
          Synced {data.syncedAt.slice(0, 10)} from{" "}
          <a href={data.source} target="_blank" rel="noreferrer">
            Riot&apos;s game updates
          </a>
          ; refreshed daily.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <div className="display mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-gold">On this page</div>
            <ol className="space-y-1 text-xs">
              {note.headings
                .filter((h) => h.text.trim() && h.text.trim() !== " ")
                .map((h, i) => (
                  <li key={i} className={h.level === 3 ? "pl-3 text-dim" : ""}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
            </ol>
          </Panel>
        </aside>
        <article>
          <SectionTitle kicker={note.publishedAt.slice(0, 10)}>{note.title}</SectionTitle>
          {note.description ? <p className="mb-4 text-sm text-dim">{note.description}</p> : null}
          <div className="patch-notes prose-tft max-w-none" dangerouslySetInnerHTML={{ __html: note.html }} />
          <p className="mt-6 text-xs text-dim">
            Original:{" "}
            <a href={note.url} target="_blank" rel="noreferrer">
              {note.url}
            </a>
            . © Riot Games; mirrored for reading offline alongside the set data.
          </p>
        </article>
      </div>

      {older.length ? (
        <Panel as="section">
          <SectionTitle kicker="Archive">Older updates</SectionTitle>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {older.map((i) => (
              <li key={i.slug}>
                <a href={i.url} target="_blank" rel="noreferrer">
                  {i.title}
                </a>{" "}
                <span className="text-xs text-dim">{i.publishedAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
