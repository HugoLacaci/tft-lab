/**
 * Public site URL, without a trailing slash, e.g. "https://user.github.io/tft-lab".
 * Set NEXT_PUBLIC_SITE_URL at build time; used for canonical/OpenGraph URLs,
 * robots.txt and the sitemap. Empty when unknown (local builds).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
