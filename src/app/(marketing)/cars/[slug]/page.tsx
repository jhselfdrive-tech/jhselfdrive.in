import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, Info, TriangleAlert } from "lucide-react";
import { site, type CarSlug } from "@/content/site";
import { carContent } from "@/content/cars";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { Fleet } from "@/components/Fleet";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbSchema, carSchema, type Crumb } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() { return site.fleet.map((car) => ({ slug: car.slug })); }

function load(slug: string) {
  const car = site.fleet.find((item) => item.slug === slug);
  const copy = carContent[slug as CarSlug];
  return car && copy ? { car, copy } : null;
}

export async function generateMetadata(props: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const found = load(slug);
  if (!found) return {};
  return pageMetadata({ title: found.copy.title, description: found.copy.description, path: `/cars/${slug}`, keywords: found.copy.keywords });
}

export default async function CarPage(props: PageProps<"/cars/[slug]">) {
  const { slug } = await props.params;
  const found = load(slug);
  if (!found) notFound();
  const { car, copy } = found;

  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: "Our cars", path: "/cars" }, { name: car.name, path: `/cars/${slug}` }];

  return <>
    <JsonLd data={[breadcrumbSchema(crumbs), carSchema(car, copy.description)]} />
    <PageHero
      crumbs={crumbs}
      eyebrow={car.example}
      title={copy.h1}
      lede={copy.lede}
      meta={[`₹${car.dayRate.toLocaleString("en-IN")} / day`, `${car.seats} seats`, car.transmission, car.fuel]}
    />

    <section className="section"><div className="shell details-grid"><div className="copy-block">{copy.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<h2 className="section-title">Best for</h2><ul className="tick-list">{copy.bestFor.map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul><p className="not-ideal"><TriangleAlert size={17} /> <span><strong>Not the right car for:</strong> {copy.notIdealFor}</span></p></div><div className="pricing-panel"><h3>{car.name} at a glance</h3><div className="pricing-row"><span>Daily rate</span><strong>From ₹{car.dayRate.toLocaleString("en-IN")}</strong></div><div className="pricing-row"><span>Seats</span><strong>{car.seats}</strong></div><div className="pricing-row"><span>Transmission</span><strong>{car.transmission}</strong></div><div className="pricing-row"><span>Fuel</span><strong>{car.fuel}</strong></div><div className="pricing-row"><span>Included distance</span><strong>{site.pricing.includedKm}</strong></div><div className="pricing-row"><span>Extra kilometres</span><strong>₹{car.kmRate} / km</strong></div><div className="pricing-row"><span>Refundable deposit</span><strong>{site.pricing.deposit}</strong></div><p className="pricing-note"><Info size={18} /> Example model shown is {car.example.toLowerCase()}. The exact vehicle is confirmed with availability before booking.</p></div></div></section>

    <section className="section" data-reveal><div className="shell"><span className="eyebrow">Why people choose it</span><h2 className="section-title">What the {car.name} does well.</h2><div className="documents documents-wide">{copy.highlights.map((item) => <div className="document" key={item.title}><span className="document-icon"><BadgeCheck size={20} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div></div></section>

    <EnquirySection defaultCarSlug={slug as CarSlug} title={`Check ${car.name} availability`} copy="Send your dates and we’ll confirm the exact vehicle and final price on WhatsApp. The form is already set to this car." />
    <FaqSection items={copy.faq} title={`${car.name} questions.`} copy="Anything else, message us — we answer these all day." />

    <section className="section" data-reveal><div className="shell"><span className="eyebrow">Not quite right?</span><h2 className="section-title">The rest of the fleet.</h2><Fleet exclude={slug as CarSlug} /></div></section>

    <FinalCta />
  </>;
}
