import Link from "next/link";
import { Phone } from "lucide-react";
import { site } from "@/content/site";
import { TrackedLink } from "./TrackedLink";

// Nav hrefs are root-relative (`/#fleet`, not `#fleet`) so they work from every sub-page.
export function Header() {
  return <header className="site-header"><nav className="nav shell" aria-label="Main navigation"><Link className="brand" href="/"><span className="brand-mark">{site.shortName}</span><span>{site.name}</span></Link><div className="nav-links"><Link className="nav-link" href="/cars">Our cars</Link><Link className="nav-link" href="/#how">How it works</Link><Link className="nav-link" href="/#pricing">Pricing</Link><Link className="nav-link" href="/#faq">FAQs</Link></div><TrackedLink className="nav-call" event="call_click" href={`tel:${site.phoneE164}`}><Phone size={15} /> {site.phoneDisplay}</TrackedLink></nav></header>;
}
