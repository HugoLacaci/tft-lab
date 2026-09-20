import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { ReactNode } from "react";
import { mdxComponents } from "@/components/mdx";

export interface GuideFrontmatter extends Record<string, unknown> {
  title: string;
  description?: string;
  pillar?: string;
  order?: number;
  trainerCategory?: string;
  updated?: string;
}

/**
 * Compile an MDX source at build time with the shared component map.
 * Uses @mdx-js/mdx directly: next-mdx-remote 6 drops JSX expression props
 * (`items={[...]}`), which the guide components depend on.
 */
export async function renderMdx<F extends Record<string, unknown> = GuideFrontmatter>(source: string): Promise<{ content: ReactNode; frontmatter: F }> {
  const { content: body, data } = matter(source);
  const mod = await evaluate(body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
    development: false,
  });
  const MDXContent = mod.default;
  return { content: <MDXContent components={mdxComponents} />, frontmatter: data as F };
}
