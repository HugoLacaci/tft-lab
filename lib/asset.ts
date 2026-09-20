/**
 * Prefix a site-local path (icons under /assets, generic SVGs) with the base
 * path the site is deployed under. Empty for a root deploy; "/tft-lab" when
 * hosted as a GitHub project page. next/link and CSS handle this themselves;
 * next/image with `unoptimized` does not, hence this helper.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function asset(src: string): string {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return src;
  if (BASE_PATH && src.startsWith(`${BASE_PATH}/`)) return src;
  return `${BASE_PATH}${src}`;
}
