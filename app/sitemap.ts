import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { guideSlugs } from "@/lib/guide-sections";
import { loadSetData } from "@/lib/set-data";
import { SCENARIO_CATEGORIES } from "@/lib/scenario-categories";

export const dynamic = "force-static";

const STATIC = ["", "/guides", "/set", "/set/champions", "/set/traits", "/set/items", "/set/augments", "/set/wisps", "/set/comps", "/set/patch-notes", "/trainer", "/trainer/daily", "/lab", "/lab/board", "/lab/odds", "/lab/econ", "/lab/cheatsheet", "/routine", "/tracker", "/compete", "/resources"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL || "https://example.invalid";
  const now = new Date();
  const urls: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${base}${p}/`, lastModified: now }));
  for (const slug of guideSlugs()) urls.push({ url: `${base}/guides/${slug}/`, lastModified: now });
  for (const c of SCENARIO_CATEGORIES) urls.push({ url: `${base}/trainer/${c}/`, lastModified: now });
  for (const c of loadSetData()?.champions ?? []) urls.push({ url: `${base}/set/champions/${c.id}/`, lastModified: now });
  return urls;
}
