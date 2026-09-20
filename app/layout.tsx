import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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

const DESCRIPTION = "Guides, decision drills, a team planner with a fight simulator, live set data and a match-history tracker for Teamfight Tactics players climbing from Emerald to Master and beyond.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: { default: "TFT Lab", template: "%s · TFT Lab" },
  description: DESCRIPTION,
  applicationName: "TFT Lab",
  openGraph: { type: "website", siteName: "TFT Lab", title: "TFT Lab", description: DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary", title: "TFT Lab", description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="antialiased flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-panel focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
