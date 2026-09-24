import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Backdrop } from "@/components/layout/Backdrop";
import { BottomNav } from "@/components/layout/BottomNav";
import { SITE_URL } from "@/lib/site";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

// Body text uses `optional`: on a slow connection the system fallback stays,
// which keeps the first paragraph (the LCP element on guide pages) from being
// re-painted late by the font swap. Headings keep `swap` because Cinzel is the look.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "optional",
});

const DESCRIPTION = "Comps tier list for the current patch, live set data (champions, traits, items, augments), mirrored patch notes, decision drills, a team planner with a fight simulator and a match tracker for Teamfight Tactics.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: { default: "TFT Lab · Comps, set data and drills for Teamfight Tactics", template: "%s · TFT Lab" },
  description: DESCRIPTION,
  applicationName: "TFT Lab",
  keywords: ["TFT", "Teamfight Tactics", "comps", "tier list", "meta", "patch notes", "augments", "items", "champions", "team planner"],
  openGraph: { type: "website", siteName: "TFT Lab", title: "TFT Lab", description: DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary_large_image", title: "TFT Lab", description: DESCRIPTION },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "TFT Lab", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home indicator; the header, main and bottom bar
  // pad with env(safe-area-inset-*) so nothing hides behind them in landscape.
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="antialiased flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-panel focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Backdrop />
        <Header />
        <main id="main" className="site-main">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
