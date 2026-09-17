import { AnalyticsListener } from "@/components/AnalyticsListener";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyContactBar } from "@/components/StickyContactBar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="marketing-app"><AnalyticsListener /><Header /><main id="main-content" tabIndex={-1}>{children}</main><SiteFooter /><StickyContactBar /></div>;
}
