import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { site } from "@/content/site";
import { locations } from "@/content/locations";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return <>
    <Header />
    <main>
      <PageHero eyebrow="404" title="That road doesn’t exist." lede="The page you were looking for has moved or was never here. These still work." />
      <section className="section"><div className="shell copy-block"><div className="area-list"><Link className="area-chip" href="/">Home</Link><Link className="area-chip" href="/cars">Our cars</Link>{site.fleet.map((car) => <Link className="area-chip" href={`/cars/${car.slug}`} key={car.slug}>{car.name}</Link>)}{locations.map((location) => <Link className="area-chip" href={`/${location.slug}`} key={location.slug}>{location.city}</Link>)}</div></div></section>
    </main>
    <SiteFooter />
  </>;
}
