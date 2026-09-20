import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH="/repo-name" when deploying as a GitHub project
// page (https://<user>.github.io/<repo>/); leave it unset for a root deploy
// (user site, custom domain, Netlify, Cloudflare Pages, Vercel).
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  // Guides are MDX compiled at build time by @mdx-js/mdx; no MDX loader needed.
  pageExtensions: ["ts", "tsx"],
};

export default nextConfig;
