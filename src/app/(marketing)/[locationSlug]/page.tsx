import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Info, MapPin, Route } from "lucide-react";
import { site } from "@/content/site";
import { carContent } from "@/content/cars";
import { findLocation, locations, locationSlugs } from "@/content/locations";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbSchema, faqSchema, serviceAreaSchema, type Crumb } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() { return locationSlugs.map((locationSlug) => ({ locationSlug })); }

export async function generateMetadata(props: PageProps<"/[locationSlug]">): Promise<Metadata> {
  const { locationSlug } = await props.params;
  const location = findLocation(locationSlug);
  if (!location) return {};
  return pageMetadata({ title: location.title, description: location.description, path: `/${location.slug}`, keywords: location.keywords });
}

export default async function LocationPage(props: PageProps<"/[locationSlug]">) {
  const { locationSlug } = await props.params;
  const location = findLocation(locationSlug);
  if (!location) notFound();

  const car = site.fleet.find((item) => item.slug === location.recommendedCar)!;
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: location.city, path: `/${location.slug}` }];
  const nearby = locations.filter((item) => item.slug !== location.slug).slice(0, 2);

  return <>
    <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(location.faq), serviceAreaSchema({ city: location.city, slug: location.slug, description: location.description })]} />
    <PageHero
      crumbs={crumbs}
      eyebrow={`Serving ${location.city}`}
      title={location.h1}
      lede={location.lede}
      meta={[`${location.distanceKm} km from our base`, location.driveTime, `From ₹${car.dayRate.toLocaleString("en-IN")} / day`]}
    />

    <section className="section"><div className="shell details-grid"><div className="copy-block">{location.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className="pricing-panel"><h3>Getting there</h3><div className="pricing-row"><span>Distance from base</span><strong>{location.distanceKm} km</strong></div><div className="pricing-row"><span>Typical drive time</span><strong>{location.driveTime}</strong></div><div className="pricing-row"><span>Suggested car</span><strong>{car.name}</strong></div><div className="pricing-row"><span>Included distance</span><strong>{site.pricing.includedKm}</strong></div><p className="pricing-note"><Route size={18} /> Route: {location.route}.</p><p className="pricing-note"><Info size={18} /> {location.pickup}</p></div></div></section>

    <section className="section" data-reveal><div className="shell"><span className="eyebrow">Why self-drive here</span><h2 className="section-title">What a car of your own changes in {location.city}.</h2><div className="documents documents-wide">{location.reasons.map((reason) => <div className="document" key={reason.title}><span className="document-icon"><BadgeCheck size={20} /></span><div><strong>{reason.title}</strong><p>{reason.detail}</p></div></div>)}</div></div></section>

    <section className="experience-ribbon experience-ribbon-auto shell" data-reveal aria-label={`Places to drive from ${location.city}`}>{location.trips.map((trip, index) => <article className={`experience-card ${["experience-coral", "experience-yellow", "experience-mint", "experience-blue"][index % 4]}`} key={trip.name}><MapPin size={25} /><div><small>{trip.detail}</small><strong>{trip.name}</strong></div><span>{String(index + 1).padStart(2, "0")}</span></article>)}</section>

    <section className="section"><div className="shell copy-block"><span className="eyebrow">Local notes</span><h2 className="section-title">Worth knowing before you set off.</h2><ul className="note-list">{location.localNotes.map((note) => <li key={note}>{note}</li>)}</ul></div></section>

    <HowItWorks />
    <EnquirySection defaultCarSlug={location.recommendedCar} title={`Planning a trip to ${location.city}?`} copy={`Send your dates and route. The form is set to the ${car.name}, which is what we usually suggest for ${location.city} — change it if you prefer.`} />
    <FaqSection items={location.faq} title={`${location.city} questions.`} copy="Anything specific to your route, just ask on WhatsApp." />

    <section className="section"><div className="shell copy-block"><span className="eyebrow">Also useful</span><h2 className="section-title">Keep looking.</h2><div className="area-list"><Link className="area-chip" href="/">Self-drive cars in Ramanathapuram</Link><Link className="area-chip" href={`/cars/${car.slug}`}>{carContent[car.slug].h1} details</Link>{nearby.map((item) => <Link className="area-chip" href={`/${item.slug}`} key={item.slug}>Self-drive cars in {item.city}</Link>)}</div></div></section>

    <FinalCta />
  </>;
}
