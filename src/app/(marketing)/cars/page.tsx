import type { Metadata } from "next";
import { Info } from "lucide-react";
import { site } from "@/content/site";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { FinalCta } from "@/components/sections/FinalCta";
import { Fleet } from "@/components/Fleet";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbSchema, carItemListSchema, type Crumb } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

const crumbs: Crumb[] = [{ name: "Home", path: "/" }, { name: "Our cars", path: "/cars" }];

export const metadata: Metadata = pageMetadata({
  title: "Our Self Drive Cars & Daily Rates",
  description: `Compare the JH Self Drive fleet in Ramanathapuram — hatchback, compact SUV and 7-seater MPV. Daily rates from ₹${site.fleet[0].dayRate.toLocaleString("en-IN")} with ${site.pricing.includedKm} included.`,
  path: "/cars",
  keywords: ["self drive cars Ramanathapuram", "car rental rates Ramanathapuram", "7 seater self drive Ramanathapuram"],
});

export default function CarsPage() {
  return <>
    <JsonLd data={[breadcrumbSchema(crumbs), carItemListSchema(site.fleet.map((car) => car.slug))]} />
    <PageHero
      crumbs={crumbs}
      eyebrow="Pick your pace"
      title="Our self-drive cars"
      lede={`Three cars, one clear daily rate each, ${site.pricing.includedKm} included. The exact model is confirmed with availability before you book.`}
      meta={[`From ₹${site.fleet[0].dayRate.toLocaleString("en-IN")} / day`, site.pricing.includedKm, `Deposit ${site.pricing.deposit.toLowerCase()}`]}
    />

    <section className="section" data-reveal><div className="shell"><Fleet /><p className="fine-print">* Fleet and rates shown are launch estimates. Final car, included kilometres and price are confirmed before booking.</p></div></section>

    <section className="section"><div className="shell details-grid"><div className="copy-block"><span className="eyebrow">How the pricing works</span><h2 className="section-title">One daily rate, then kilometres.</h2><p>Every car is priced per day. That day includes {site.pricing.includedKm}; beyond that you pay a per-kilometre rate that varies by car. Fuel is separate — you take the car at a recorded level and return it at the same level.</p><p>The refundable deposit is confirmed before you book and returned after the car comes back and the handover checks are done. There is no booking fee and nothing to pay online.</p></div><div className="pricing-panel"><h3>Rates at a glance</h3>{site.fleet.map((car) => <div className="pricing-row" key={car.slug}><span>{car.name}</span><strong>₹{car.dayRate.toLocaleString("en-IN")} / day</strong></div>)}<div className="pricing-row"><span>Included distance</span><strong>{site.pricing.includedKm}</strong></div><div className="pricing-row"><span>Refundable deposit</span><strong>{site.pricing.deposit}</strong></div><p className="pricing-note"><Info size={18} /> Final pricing depends on car, dates, route and availability. We confirm the full amount before you commit.</p></div></div></section>

    <HowItWorks />
    <EnquirySection title="Found the one? Check availability." copy="Tell us your dates and preferred car. We’ll confirm the exact vehicle and price on WhatsApp." />
    <FinalCta />
  </>;
}
