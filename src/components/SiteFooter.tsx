import Link from "next/link";
import { site } from "@/content/site";
import { carContent } from "@/content/cars";
import { locations } from "@/content/locations";

// Site-wide internal link hub — this is what gets the car and location pages crawled.
export function SiteFooter() {
  return <footer className="footer"><div className="shell">
    <div className="footer-grid">
      <div className="footer-col footer-brand"><Link className="brand" href="/"><span className="brand-mark">{site.shortName}</span><span>{site.name}</span></Link><p>{site.description}</p></div>
      <div className="footer-col"><h2>Our cars</h2><ul>{site.fleet.map((car) => <li key={car.slug}><Link href={`/cars/${car.slug}`}>{carContent[car.slug].h1}</Link></li>)}<li><Link href="/cars">Compare the fleet</Link></li></ul></div>
      <div className="footer-col"><h2>Areas we serve</h2><ul><li><Link href="/">Ramanathapuram</Link></li>{locations.map((location) => <li key={location.slug}><Link href={`/${location.slug}`}>{location.city}</Link></li>)}</ul></div>
      <div className="footer-col"><h2>Contact</h2><ul><li><a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a></li><li><a href={`mailto:${site.email}`}>{site.email}</a></li><li>{site.address}</li><li>{site.hours}</li></ul></div>
    </div>
    <div className="footer-row"><span>© {new Date().getFullYear()} {site.name} · Ramanathapuram, Tamil Nadu</span><span>Drive responsibly. Follow local traffic rules.</span></div>
  </div></footer>;
}
