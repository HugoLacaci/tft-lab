import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

/**
 * Guide file helpers shared by the guides pages, the link checker and the
 * trainer's "Explain more" (which inlines the linked section).
 */
export const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export function guideSlugs(root = GUIDES_DIR): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}

export function readGuide(slug: string, root = GUIDES_DIR): { content: string; data: Record<string, unknown> } | null {
  const file = path.join(root, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const { content, data } = matter(fs.readFileSync(file, "utf8"));
  return { content, data };
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
  line: number;
}

/** Headings with the same slugs rehype-slug will generate (github-slugger). */
export function headings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ depth: m[1]!.length, text: m[2]!, slug: slugger.slug(stripInline(m[2]!)), line: i });
  });
  return out;
}

function stripInline(s: string): string {
  return s.replace(/[*_`]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/**
 * Markdown of one section: from the heading with `anchor` to the next heading
 * of the same or higher level. Without an anchor, the intro before the first
 * h2. Returns null when the anchor is missing.
 */
export function extractSection(markdown: string, anchor?: string): string | null {
  const lines = markdown.split("\n");
  const hs = headings(markdown);
  if (!anchor) {
    const first = hs.find((h) => h.depth === 2);
    return lines.slice(0, first ? first.line : lines.length).join("\n").trim();
  }
  const idx = hs.findIndex((h) => h.slug === anchor);
  if (idx < 0) return null;
  const h = hs[idx]!;
  const next = hs.slice(idx + 1).find((x) => x.depth <= h.depth);
  return lines.slice(h.line, next ? next.line : lines.length).join("\n").trim();
}

export function parseGuideLink(link: string): { slug: string; anchor?: string } | null {
  const m = link.match(/^\/guides\/([a-z0-9-]+)\/?(?:#([a-z0-9-]+))?$/);
  if (!m) return null;
  return { slug: m[1]!, anchor: m[2] };
}
