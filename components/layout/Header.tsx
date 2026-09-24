import Link from "next/link";
import { SetBadge } from "./SetBadge";
import { SiteNav } from "./SiteNav";
import { NAV } from "./nav";
import { LogoMark } from "@/components/ui/Glyphs";
import { newsStamps } from "@/lib/whats-new-server";
import { livePatch } from "@/lib/live-patch";

export { NAV };

export function Header() {
  const patch = livePatch();
  return (
    <header className="site-header no-print">
      <div className="gold-rule gold-rule-shine absolute inset-x-0 bottom-0 opacity-40" aria-hidden />
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="TFT Lab home">
          <LogoMark />
          <span>TFT LAB</span>
        </Link>
        <SetBadge patch={patch.label} />
        <SiteNav items={NAV} stamps={newsStamps()} patch={patch.label} />
      </div>
    </header>
  );
}
