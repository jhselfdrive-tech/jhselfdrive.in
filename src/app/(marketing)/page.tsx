import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, BadgeCheck, Check, Clock3, Compass, FileCheck2, IndianRupee, Info, MapPin, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { site } from "@/content/site";
import { categoryPhotoUrls } from "@/lib/fleet/public";
import { locations } from "@/content/locations";
import { BookingSection } from "@/components/sections/BookingSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { Fleet } from "@/components/Fleet";
import { HeroTripCard } from "@/components/HeroTripCard";
import { JsonLd } from "@/components/JsonLd";
import { TrackedLink } from "@/components/TrackedLink";
import { faqSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Self Drive Car Rental in Ramanathapuram | Book Online",
  ogTitle: "Your road. Your time. | JH Self Drive",
  description: site.description,
  path: "/",
  keywords: ["self drive car Ramanathapuram", "car rental Ramanathapuram", "self drive car Rameswaram", "self drive cars near me", "JH Self Drive", "book self drive car"],
});

const areaLinks = site.serviceAreas.map((area) => ({ area, slug: locations.find((location) => location.city === area)?.slug }));

const HERO_BLUR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACqADAAQAAAABAAAABQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgABQAKAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/dAAQAAf/aAAwDAQACEQMRAD8AzL/xDc3C4WKJM9cCueNxITnA59v/AK9LJ0FQDpWcUkjWW5//2Q==";

// Photos come from the fleet database; revalidated so new uploads appear
// without a redeploy.
export const revalidate = 300;

export default async function Home() {
  const fleetPhotos = await categoryPhotoUrls();
  return (
    <>
      <JsonLd data={faqSchema(site.faq)} />

      {/* Hero Section */}
      <section className="hero" id="top">
        <Image
          className="hero-image"
          src="/images/ramanathapuram-road-trip.webp"
          alt="A self-drive SUV on a coastal road near Ramanathapuram"
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HERO_BLUR}
        />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="shell hero-grid">
          <div className="hero-content">
            <div className="hero-pill">
              <Compass size={14} /> Your road. Your time.
            </div>
            <h1>
              Self-drive car rental in <span>Ramanathapuram</span>
            </h1>
            <p className="hero-copy">
              Clean, reliable cars for temple trips, family days and coastal getaways.
              No driver, complete privacy, zero upfront online payment.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/booking">
                Book a Car Now <ArrowRight size={17} />
              </Link>
              <TrackedLink
                className="button button-secondary"
                href={businessWhatsAppUrl()}
                event="whatsapp_click"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} /> WhatsApp us
              </TrackedLink>
            </div>
            <div className="hero-proof">
              <div className="proof-item">
                <span className="proof-icon"><Check size={14} /></span>
                Pay at vehicle pickup
              </div>
              <div className="proof-item">
                <span className="proof-icon"><Check size={14} /></span>
                250 km/day included
              </div>
              <div className="proof-item">
                <span className="proof-icon"><Check size={14} /></span>
                Instant WhatsApp approval
              </div>
            </div>
          </div>
          <HeroTripCard />
        </div>
        <a className="scroll-cue" href="#service">
          Explore Service <ArrowDown size={15} />
        </a>
      </section>

      {/* Trust & Service Highlights ("This is our service") */}
      <section className="section" id="service" style={{ paddingBottom: 40 }} data-reveal>
        <div className="shell">
          <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}>What We Provide</span>
            <h2 className="section-title" style={{ margin: "14px auto 16px" }}>The JH Self Drive promise.</h2>
            <p className="section-copy" style={{ margin: "0 auto" }}>
              Every rental is designed for hassle-free travel. No complicated apps, no hidden surprise fees, and full local support in Ramanathapuram.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e0f1e8", color: "var(--teal)", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Sparkles size={22} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>Clean &amp; Inspected</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                Every car is sanitized, fluid-checked, and thoroughly inspected before handover. You drive away with peace of mind.
              </p>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ffeadc", color: "#b95735", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Compass size={22} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>250 km / Day Included</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                Generous daily distance allowance with simple, transparent per-kilometre rates if you wander further.
              </p>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eee5ff", color: "#734ca1", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>Pay on Pickup</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                No online credit card payments needed now. Inspect your car first, then pay rental and refundable deposit via UPI or cash.
              </p>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dce9ff", color: "#3a6ba7", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Clock3 size={22} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>7 AM – 10 PM Support</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                Local support team based in Ramanathapuram. Quick response on WhatsApp and phone whenever you need guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section className="section fleet-section" id="fleet" data-reveal>
        <div className="shell">
          <div className="fleet-head">
            <div>
              <span className="eyebrow">Available Fleet</span>
              <h2 className="section-title">Three ways to chase the horizon.</h2>
            </div>
            <p className="section-copy">
              Choose an easy city hatchback, a comfortable compact SUV, or a 7-seater MPV for the whole family.
            </p>
          </div>
          <Fleet photos={fleetPhotos} />
          <p className="fine-print">
            * Daily rates include 250 km/day. Fuel is return-at-same-level. Refundable deposit confirmed before booking.
          </p>
        </div>
      </section>

      {/* Direct Booking Section */}
      <BookingSection />

      {/* Pricing Essentials & Documents */}
      <section className="section" id="pricing">
        <div className="shell details-grid">
          <div>
            <span className="eyebrow">Ready to drive</span>
            <h2 className="section-title">Just the essentials. Nothing hidden.</h2>
            <p className="section-copy">Keep these documents ready for a smooth verification and pickup in Ramanathapuram.</p>
            <div className="documents">
              {site.requirements.map((item, index) => {
                const Icon = [FileCheck2, BadgeCheck, IndianRupee][index];
                return (
                  <div className="document" key={item.title}>
                    <span className="document-icon"><Icon size={20} /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pricing-panel">
            <h3>Clear pricing basics</h3>
            <div className="pricing-row">
              <span>Daily rental</span>
              <strong>From ₹{site.fleet[0].dayRate.toLocaleString("en-IN")}</strong>
            </div>
            <div className="pricing-row">
              <span>Included distance</span>
              <strong>{site.pricing.includedKm}</strong>
            </div>
            <div className="pricing-row">
              <span>Refundable deposit</span>
              <strong>{site.pricing.deposit}</strong>
            </div>
            <div className="pricing-row">
              <span>Fuel policy</span>
              <strong>{site.pricing.fuel}</strong>
            </div>
            <p className="pricing-note">
              <Info size={18} /> Zero online prepayment required. Pay at vehicle handover in Ramanathapuram.
            </p>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="area" id="area">
        <div className="shell area-grid">
          <div>
            <span className="eyebrow">Close to home</span>
            <h2 className="section-title">Based in Ramanathapuram. Built for journeys beyond.</h2>
            <p className="section-copy">Planning Rameswaram, a family visit, or a coastal road trip? We are here to get you on the road smoothly.</p>
            <div className="area-list">
              {areaLinks.map(({ area, slug }) =>
                slug ? (
                  <Link className="area-chip" href={`/${slug}`} key={area}>
                    {area}
                  </Link>
                ) : (
                  <span className="area-chip" key={area}>
                    {area}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="map-card" aria-label="Service area centred on Ramanathapuram">
            <div className="map-pin"><MapPin size={28} /></div>
            <div className="map-label">
              <strong>Ramanathapuram</strong>
              <span>Serving Rameswaram, Paramakudi &amp; nearby coastal routes</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqSection items={site.faq} />

      {/* Final Call to Action */}
      <FinalCta />
    </>
  );
}
