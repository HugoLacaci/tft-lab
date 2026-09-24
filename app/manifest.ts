import type { MetadataRoute } from "next";
import { asset } from "@/lib/asset";

export const dynamic = "force-static";

/** Installable on a phone home screen; served at <basePath>/manifest.webmanifest and linked automatically. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TFT Lab",
    short_name: "TFT Lab",
    description: "Comps tier list, live set data, patch notes and drills for Teamfight Tactics.",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    orientation: "any",
    background_color: "#070b12",
    theme_color: "#070b12",
    icons: [
      { src: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: asset("/icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
