import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Crumb } from "@/lib/seo/schema";

type Props = { eyebrow?: string; title: React.ReactNode; lede?: string; crumbs?: readonly Crumb[]; meta?: string[]; children?: React.ReactNode };

// The site header is `position: absolute; color: white` over the homepage's dark hero, so
// every sub-page has to open with a dark band or the nav is invisible. That is this component.
export function PageHero({ eyebrow, title, lede, crumbs, meta, children }: Props) {
  return <section className="page-hero" id="top"><div className="shell page-hero-inner">
    {crumbs?.length ? <Breadcrumbs crumbs={crumbs} /> : null}
    {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
    <h1>{title}</h1>
    {lede ? <p className="page-hero-lede">{lede}</p> : null}
    {meta?.length ? <div className="page-hero-meta">{meta.map((item) => <span className="hero-pill" key={item}>{item}</span>)}</div> : null}
    {children}
  </div></section>;
}
