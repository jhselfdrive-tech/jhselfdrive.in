import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Check, FileCheck2, MapPin, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { site } from "@/content/site";
import { locations } from "@/content/locations";
import { categoryPhotoUrls } from "@/lib/fleet/public";
import { Fleet } from "@/components/Fleet";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { JsonLd } from "@/components/JsonLd";
import { TrackedLink } from "@/components/TrackedLink";
import { faqSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Self Drive Cars in Ramanathapuram (Ramnad)", description: site.description, path: "/",
});
export const revalidate = 300;

export default async function Home() {
  const photos = await categoryPhotoUrls();
  return <>
    <JsonLd data={faqSchema(site.faq)} />
    <section className="journey-hero shell" id="top">
      <div className="journey-intro">
        <span className="location-label"><span /> LOCAL KEYS. LIMITLESS PLANS.</span>
        <h1>Your next trip.<br />Your own <em>way.</em></h1>
        <p className="journey-subtitle">Self-drive car rental in Ramanathapuram (Ramnad)</p>
        <p className="journey-description">A temple trail. A family weekend. A little escape.<br className="desktop-break" /> Find your car, take the keys, and make it yours.</p>
        <div className="journey-actions"><Link className="button button-primary" href="/booking">Find my car <ArrowUpRight size={19} /></Link><Link className="journey-text-link" href="#fleet">Explore the fleet <ArrowRight size={16} /></Link></div>
        <div className="journey-assurance"><ShieldCheck size={19} /><span>No online advance payment <b>·</b> Local support</span></div>
      </div>
      <div className="journey-photo">
        <Image src="/images/ramanathapuram-road-trip.webp" alt="A self-drive SUV on a coastal road near Ramanathapuram" fill priority sizes="(max-width: 760px) 100vw, 50vw" />
        <div className="journey-photo-top"><span><MapPin size={14} /> Ramanathapuram, Tamil Nadu</span><span className="journey-photo-arrow"><ArrowUpRight size={23} /></span></div>
        <div className="journey-photo-caption"><small>LESS PLANNING. MORE LIVING.</small><strong>The coast is calling.</strong><span>We&apos;ll get you there.</span></div>
        <div className="journey-price"><span>YOUR JOURNEY STARTS AT</span><strong>₹{site.fleet[0].dayRate.toLocaleString("en-IN")}<small> / day</small></strong></div>
      </div>
    </section>
    <section className="rental-facts shell" aria-label="Rental essentials">
      <div><Wallet size={22} /><span><strong>Pay when you pick up</strong><small>No online advance payment</small></span></div>
      <div><MapPin size={22} /><span><strong>{site.pricing.includedKm} included</strong><small>Room to take the scenic route</small></span></div>
      <div><ShieldCheck size={22} /><span><strong>Your car. Your privacy.</strong><small>Self-drive, on your schedule</small></span></div>
    </section>
    <section className="section fleet-section" id="fleet"><div className="shell">
      <div className="fleet-head"><div><span className="eyebrow">01 / Find your fit</span><h2 className="section-title">Good company.<br />Great cars.</h2></div><div><p className="section-copy">From quick city runs to a full family getaway.<br />Choose the space that suits your plans.</p><Link className="journey-text-link" href="/cars">Compare all cars <ArrowUpRight size={17} /></Link></div></div>
      <Fleet photos={photos} />
      <p className="fine-print">Daily rates include {site.pricing.includedKm}. Fuel and refundable deposit are additional. Availability confirmed for your dates.</p>
    </div></section>
    <HowItWorks />
    <section className="section" id="pricing"><div className="shell essentials-layout">
      <div><span className="eyebrow">03 / A little preparation</span><h2 className="section-title">Less paperwork.<br />More open road.</h2><p className="section-copy">Know what to bring and what you pay before you arrive. Our team confirms the details with you.</p><div className="essentials-documents">{site.requirements.map(item => <div key={item.title}><FileCheck2 size={21} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div></div>
      <div className="rental-receipt"><span className="eyebrow">No guesswork</span><h3>Your rental, explained.</h3><div className="pricing-row"><span>Daily rental</span><strong>From ₹{site.fleet[0].dayRate.toLocaleString("en-IN")}</strong></div><div className="pricing-row"><span>Distance included</span><strong>{site.pricing.includedKm}</strong></div><div className="pricing-row"><span>Refundable deposit</span><strong>{site.pricing.deposit}</strong></div><div className="pricing-row"><span>Fuel</span><strong>{site.pricing.fuel}</strong></div><p><Check size={17} /> Pay rental and deposit at pickup.</p><Link className="button button-teal" href="/booking">See cars for my dates <ArrowRight size={17} /></Link></div>
    </div></section>
    <section className="destinations-section" id="area"><div className="shell"><div className="fleet-head"><div><span className="eyebrow">04 / Take the long way</span><h2 className="section-title">One pickup.<br />So many possibilities.</h2></div><p className="section-copy">Start in Ramanathapuram. Explore nearby towns and coastal routes at your own pace.</p></div><div className="destination-grid">{locations.map((location, i) => <Link className="destination-card" href={`/${location.slug}`} key={location.slug}><span className="destination-number">0{i + 1}</span><ArrowUpRight size={24} /><div><small>FROM RAMANATHAPURAM</small><h3>{location.city}</h3><p>Approx. {location.distanceKm} km · {location.driveTime}</p></div></Link>)}</div></div></section>
    <section className="regional-intro shell"><div><span className="eyebrow">A little further afield</span><h2>Planning Madurai or another district?</h2><p>For outstation self-drive car hire, share your route before booking. Our team will confirm the travel area, mileage and pickup arrangements from Ramanathapuram.</p></div><Link className="journey-text-link" href="/outstation-self-drive-car-rental">Plan an outstation trip <ArrowUpRight size={18} /></Link></section>
    <FaqSection items={site.faq} />
    <section className="personal-help shell" id="service"><div><MessageCircle size={25} /><span><strong>A real person, a little local knowledge.</strong><small>Need help choosing a car or planning pickup? Talk to our team.</small></span></div><TrackedLink href={businessWhatsAppUrl()} event="whatsapp_click" className="journey-text-link" target="_blank" rel="noreferrer">Let&apos;s talk <ArrowUpRight size={18} /></TrackedLink></section>
    <FinalCta title="Go on. Make a little room for adventure." copy="Your next journey starts with a car and a plan." />
  </>;
}
