import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Guides are MDX compiled at build time by next-mdx-remote/rsc; no MDX loader needed.
  pageExtensions: ["ts", "tsx"],
};

export default nextConfig;
