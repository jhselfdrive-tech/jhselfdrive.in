import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, BadgeCheck, Check, Clock3, Compass, FileCheck2, IndianRupee, Info, MapPin, MessageCircle, Mountain, ShieldCheck, Sparkles, Sunrise, Users } from "lucide-react";
import { site } from "@/content/site";
import { locations } from "@/content/locations";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { Fleet } from "@/components/Fleet";
import { HeroTripCard } from "@/components/HeroTripCard";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { JsonLd } from "@/components/JsonLd";
import { TrackedLink } from "@/components/TrackedLink";
import { faqSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Self Drive Car Rental in Ramanathapuram",
  ogTitle: "Your road. Your time. | JH Self Drive",
  description: site.description,
  path: "/",
  keywords: ["self drive car Ramanathapuram", "car rental Ramanathapuram", "self drive car Rameswaram", "self drive cars near me", "JH Self Drive"],
});

// Ramanathapuram stays a plain chip — "/" already targets that term, so it gets no
// competing landing page. The other areas link out; this is the main crawl path to them.
const areaLinks = site.serviceAreas.map((area) => ({ area, slug: locations.find((location) => location.city === area)?.slug }));

const HERO_BLUR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACqADAAQAAAABAAAABQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgABQAKAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMACQkJCQkJEAkJEBYQEBAWHhYWFhYeJh4eHh4eJi4mJiYmJiYuLi4uLi4uLjc3Nzc3N0BAQEBASEhISEhISEhISP/bAEMBCwwMEhESHxERH0szKjNLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS//dAAQAAf/aAAwDAQACEQMRAD8AzL/xDc3C4WKJM9cCueNxITnA59v/AK9LJ0FQDpWcUkjWW5//2Q==";

export default function Home() {
  return <>
    <JsonLd data={faqSchema(site.faq)} />
      <section className="hero" id="top">
        <Image className="hero-image" src="/images/ramanathapuram-road-trip.webp" alt="A self-drive SUV on a coastal road near Ramanathapuram" fill priority sizes="100vw" placeholder="blur" blurDataURL={HERO_BLUR} />
        <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
        <div className="shell hero-grid"><div className="hero-content">
          <div className="hero-pill"><Compass size={14} /> Your road. Your time.</div>
          <h1>Self-drive car rental in <span>Ramanathapuram</span></h1>
          <p className="hero-copy">Clean, reliable cars for weekend escapes, temple trips and everyday journeys. No driver, no rigid schedule—just the freedom to go.</p>
          <div className="hero-actions"><a className="button button-primary" href="#enquire">Check availability <ArrowRight size={17} /></a><TrackedLink className="button button-secondary" href={businessWhatsAppUrl()} event="whatsapp_click" target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp us</TrackedLink></div>
          <div className="hero-proof"><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Quick confirmation</div><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Transparent pricing</div><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Local support</div></div>
        </div><HeroTripCard /></div>
        <a className="scroll-cue" href="#fleet">Explore <ArrowDown size={15} /></a>
      </section>

      <div className="trust-strip shell" data-reveal aria-label="Service benefits"><div className="trust-grid"><div className="trust-item"><Sparkles size={24} /><div><strong>Clean &amp; cared for</strong><span>Every car checked before pickup</span></div></div><div className="trust-item"><ShieldCheck size={24} /><div><strong>Simple, secure process</strong><span>Clear documents and deposit</span></div></div><div className="trust-item"><Clock3 size={24} /><div><strong>Help when you need it</strong><span>{site.hours}</span></div></div></div></div>

      <section className="experience-ribbon shell" data-reveal aria-label="Journeys made for you"><article className="experience-card experience-coral"><Sunrise size={25} /><div><small>Early escape</small><strong>Rameswaram sunrise</strong></div><span>01</span></article><article className="experience-card experience-yellow"><Users size={25} /><div><small>Room for everyone</small><strong>Family road days</strong></div><span>02</span></article><article className="experience-card experience-mint"><Mountain size={25} /><div><small>Go beyond</small><strong>Weekend wandering</strong></div><span>03</span></article><article className="experience-card experience-blue"><Compass size={25} /><div><small>Move your way</small><strong>Everyday freedom</strong></div><span>04</span></article></section>

      <section className="section fleet-section" id="fleet" data-reveal><div className="shell"><div className="fleet-head"><div><span className="eyebrow">Pick your pace</span><h2 className="section-title">Three ways to chase the horizon.</h2></div><p className="section-copy">Choose an easy city runabout, a comfortable SUV or room for the whole family. Exact model and rate are confirmed with availability.</p></div><Fleet /><p className="fine-print">* Fleet and rates shown are launch estimates. Final car, included kilometres and price are confirmed before booking.</p></div></section>

      <HowItWorks />

      <section className="section" id="pricing"><div className="shell details-grid"><div><span className="eyebrow">Ready to drive</span><h2 className="section-title">Just the essentials. Nothing hidden.</h2><p className="section-copy">Keep these documents ready for a smooth verification and pickup.</p><div className="documents">{site.requirements.map((item, index) => { const Icon = [FileCheck2, BadgeCheck, IndianRupee][index]; return <div className="document" key={item.title}><span className="document-icon"><Icon size={20} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>; })}</div></div><div className="pricing-panel"><h3>Clear pricing basics</h3><div className="pricing-row"><span>Daily rental</span><strong>From ₹{site.fleet[0].dayRate.toLocaleString("en-IN")}</strong></div><div className="pricing-row"><span>Included distance</span><strong>{site.pricing.includedKm}</strong></div><div className="pricing-row"><span>Refundable deposit</span><strong>{site.pricing.deposit}</strong></div><div className="pricing-row"><span>Fuel policy</span><strong>{site.pricing.fuel}</strong></div><p className="pricing-note"><Info size={18} /> Final pricing depends on car, dates, route and availability. We confirm the full amount before you commit.</p></div></div></section>

      <section className="area" id="area"><div className="shell area-grid"><div><span className="eyebrow">Close to home</span><h2 className="section-title">Based in Ramanathapuram. Built for journeys beyond.</h2><p className="section-copy">Planning Rameswaram, a family visit or a coastal weekend? Tell us your route and we’ll help you choose the right car.</p><div className="area-list">{areaLinks.map(({ area, slug }) => slug ? <Link className="area-chip" href={`/${slug}`} key={area}>{area}</Link> : <span className="area-chip" key={area}>{area}</span>)}</div></div><div className="map-card" aria-label="Service area centred on Ramanathapuram"><div className="map-pin"><MapPin size={28} /></div><div className="map-label"><strong>Ramanathapuram</strong><span>Serving nearby towns and routes</span></div></div></div></section>

      <EnquirySection />
      <FaqSection items={site.faq} />
      <FinalCta />
  </>;
}
