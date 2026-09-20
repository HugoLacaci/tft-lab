import Link from "next/link";
import { notFound } from "next/navigation";
import { guideSlugs, headings, readGuide } from "@/lib/guide-sections";
import { renderMdx } from "@/lib/mdx";

export function generateStaticParams() {
  return guideSlugs().map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = readGuide(slug);
  return { title: (g?.data.title as string) ?? "Guide", description: g?.data.description as string | undefined };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = readGuide(slug);
  if (!g) notFound();
  const { content, frontmatter } = await renderMdx(`---\n${Object.entries(g.data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n")}\n---\n${g.content}`);
  const toc = headings(g.content).filter((h) => h.depth === 2);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <article>
        <Link href="/guides" className="text-xs">
          ← Guides
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl">{frontmatter.title}</h1>
        {frontmatter.description ? <p className="mt-2 max-w-2xl text-dim">{frontmatter.description}</p> : null}
        {frontmatter.updated ? <p className="mt-1 text-xs text-dim">Updated {String(frontmatter.updated)}</p> : null}
        <div className="gold-rule my-5 max-w-md" />
        <div className="prose-tft">{content}</div>
      </article>
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-20 text-xs">
          <div className="display mb-2 uppercase tracking-[0.2em] text-gold">On this page</div>
          <ul className="space-y-1.5 border-l border-[var(--gold-dim)] pl-3">
            {toc.map((h) => (
              <li key={h.slug}>
                <a href={`#${h.slug}`} className="text-dim hover:text-gold-bright">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
