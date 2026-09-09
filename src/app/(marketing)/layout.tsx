import { AnalyticsListener } from "@/components/AnalyticsListener";
import { Header } from "@/components/Header";
import { LandingEnhancements } from "@/components/LandingEnhancements";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyContactBar } from "@/components/StickyContactBar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <><AnalyticsListener /><LandingEnhancements /><Header /><main>{children}</main><SiteFooter /><StickyContactBar /></>;
}
