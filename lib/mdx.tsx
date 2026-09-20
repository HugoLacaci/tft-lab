import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { mdxComponents } from "@/components/mdx";

export interface GuideFrontmatter extends Record<string, unknown> {
  title: string;
  description?: string;
  pillar?: string;
  order?: number;
  trainerCategory?: string;
  updated?: string;
}

/** Compile an MDX source at build time with the shared component map. */
export async function renderMdx<F extends Record<string, unknown> = GuideFrontmatter>(source: string) {
  return compileMDX<F>({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
    },
  });
}
