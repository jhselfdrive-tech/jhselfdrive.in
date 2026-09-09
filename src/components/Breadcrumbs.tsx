import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seo/schema";

// Takes the same array that feeds breadcrumbSchema(), so the visible trail and the
// structured data can never drift apart.
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return <nav className="crumbs" aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => {
    const last = index === crumbs.length - 1;
    return <li key={crumb.path}>{index > 0 ? <ChevronRight size={13} aria-hidden /> : null}{last ? <span aria-current="page">{crumb.name}</span> : <Link href={crumb.path}>{crumb.name}</Link>}</li>;
  })}</ol></nav>;
}
