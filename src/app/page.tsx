import Image from "next/image";
import { ArrowDown, ArrowRight, BadgeCheck, CalendarCheck, Check, Clock3, Compass, FileCheck2, IndianRupee, Info, MapPin, MessageCircle, Mountain, Phone, ShieldCheck, Sparkles, Sunrise, Users } from "lucide-react";
import { site } from "@/content/site";
import { AnalyticsListener } from "@/components/AnalyticsListener";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Fleet } from "@/components/Fleet";
import { Header } from "@/components/Header";
import { StickyContactBar } from "@/components/StickyContactBar";
import { TrackedLink } from "@/components/TrackedLink";
import { HeroTripCard } from "@/components/HeroTripCard";
import { LandingEnhancements } from "@/components/LandingEnhancements";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export default function Home() {
  return <>
    <AnalyticsListener />
    <LandingEnhancements />
    <Header />
    <main>
      <section className="hero" id="top">
        <Image className="hero-image" src="/images/ramanathapuram-road-trip.png" alt="A self-drive SUV on a coastal road near Ramanathapuram" fill priority sizes="100vw" />
        <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
        <div className="shell hero-grid"><div className="hero-content">
          <div className="hero-pill"><MapPin size={14} /> Self-drive cars in Ramanathapuram</div>
          <h1>Your road.<br /><span>Your time.</span></h1>
          <p className="hero-copy">Clean, reliable cars for weekend escapes, temple trips and everyday journeys. No driver, no rigid schedule—just the freedom to go.</p>
          <div className="hero-actions"><a className="button button-primary" href="#enquire">Check availability <ArrowRight size={17} /></a><TrackedLink className="button button-secondary" href={businessWhatsAppUrl()} event="whatsapp_click" target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp us</TrackedLink></div>
          <div className="hero-proof"><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Quick confirmation</div><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Transparent pricing</div><div className="proof-item"><span className="proof-icon"><Check size={14} /></span>Local support</div></div>
        </div><HeroTripCard /></div>
        <a className="scroll-cue" href="#fleet">Explore <ArrowDown size={15} /></a>
      </section>

      <div className="trust-strip shell" data-reveal aria-label="Service benefits"><div className="trust-grid"><div className="trust-item"><Sparkles size={24} /><div><strong>Clean & cared for</strong><span>Every car checked before pickup</span></div></div><div className="trust-item"><ShieldCheck size={24} /><div><strong>Simple, secure process</strong><span>Clear documents and deposit</span></div></div><div className="trust-item"><Clock3 size={24} /><div><strong>Help when you need it</strong><span>{site.hours}</span></div></div></div></div>

      <section className="experience-ribbon shell" data-reveal aria-label="Journeys made for you"><article className="experience-card experience-coral"><Sunrise size={25} /><div><small>Early escape</small><strong>Rameswaram sunrise</strong></div><span>01</span></article><article className="experience-card experience-yellow"><Users size={25} /><div><small>Room for everyone</small><strong>Family road days</strong></div><span>02</span></article><article className="experience-card experience-mint"><Mountain size={25} /><div><small>Go beyond</small><strong>Weekend wandering</strong></div><span>03</span></article><article className="experience-card experience-blue"><Compass size={25} /><div><small>Move your way</small><strong>Everyday freedom</strong></div><span>04</span></article></section>

      <section className="section fleet-section" id="fleet" data-reveal><div className="shell"><div className="fleet-head"><div><span className="eyebrow">Pick your pace</span><h2 className="section-title">Three ways to chase the horizon.</h2></div><p className="section-copy">Choose an easy city runabout, a comfortable SUV or room for the whole family. Exact model and rate are confirmed with availability.</p></div><Fleet /><p className="fine-print">* Fleet and rates shown are launch estimates. Final car, included kilometres and price are confirmed before booking.</p></div></section>

      <section className="section how" id="how" data-reveal><div className="how-orbit" /><div className="shell"><div className="how-head"><div><span className="eyebrow">Simple by design</span><h2 className="section-title">From enquiry to open road in three easy moves.</h2></div><p className="section-copy">No account to create, no complicated checkout. Tell us what you need and speak directly with a local person.</p></div><div className="steps"><div className="step"><span className="step-number">1</span><h3>Share your plan</h3><p>Choose a car, add your dates and leave your contact number.</p></div><div className="step"><span className="step-number">2</span><h3>Confirm on WhatsApp</h3><p>We check availability and share the final price and pickup details.</p></div><div className="step"><span className="step-number">3</span><h3>Pick up & go</h3><p>Bring your documents, complete a quick handover and enjoy the drive.</p></div></div></div></section>

      <section className="section" id="pricing"><div className="shell details-grid"><div><span className="eyebrow">Ready to drive</span><h2 className="section-title">Just the essentials. Nothing hidden.</h2><p className="section-copy">Keep these documents ready for a smooth verification and pickup.</p><div className="documents">{site.requirements.map((item, index) => { const Icon = [FileCheck2, BadgeCheck, IndianRupee][index]; return <div className="document" key={item.title}><span className="document-icon"><Icon size={20} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>; })}</div></div><div className="pricing-panel"><h3>Clear pricing basics</h3><div className="pricing-row"><span>Daily rental</span><strong>From ₹{site.fleet[0].dayRate.toLocaleString("en-IN")}</strong></div><div className="pricing-row"><span>Included distance</span><strong>{site.pricing.includedKm}</strong></div><div className="pricing-row"><span>Refundable deposit</span><strong>{site.pricing.deposit}</strong></div><div className="pricing-row"><span>Fuel policy</span><strong>{site.pricing.fuel}</strong></div><p className="pricing-note"><Info size={18} /> Final pricing depends on car, dates, route and availability. We confirm the full amount before you commit.</p></div></div></section>

      <section className="area" id="area"><div className="shell area-grid"><div><span className="eyebrow">Close to home</span><h2 className="section-title">Based in Ramanathapuram. Built for journeys beyond.</h2><p className="section-copy">Planning Rameswaram, a family visit or a coastal weekend? Tell us your route and we’ll help you choose the right car.</p><div className="area-list">{site.serviceAreas.map((area) => <span className="area-chip" key={area}>{area}</span>)}</div></div><div className="map-card" aria-label="Service area centred on Ramanathapuram"><div className="map-pin"><MapPin size={28} /></div><div className="map-label"><strong>Ramanathapuram</strong><span>Serving nearby towns and routes</span></div></div></div></section>

      <section className="section enquiry" id="enquire"><div className="shell enquiry-grid"><div><span className="eyebrow">Check availability</span><h2 className="section-title">Where are you heading next?</h2><p className="section-copy">Send your dates in under a minute. We’ll save your request and open WhatsApp so you can continue the conversation.</p><div className="contact-card"><div className="contact-row"><Phone size={17} /> <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a></div><div className="contact-row"><Clock3 size={17} /> {site.hours}</div><div className="contact-row"><MapPin size={17} /> {site.address}</div></div></div><EnquiryForm /></div></section>

      <section className="section" id="faq"><div className="shell faq-grid"><div><span className="eyebrow">Good to know</span><h2 className="section-title">Questions, answered.</h2><p className="section-copy">Still unsure? Message us—we’re happy to help.</p></div><div className="faq-list">{site.faq.map((item) => <details className="faq-item" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>

      <section className="final-cta"><div className="shell"><div className="cta-panel"><div><h2>Plans made? Let’s find your car.</h2><p>A quick message is all it takes to get started.</p></div><div className="cta-buttons"><a className="button button-primary" href="#enquire"><CalendarCheck size={17} /> Check availability</a><TrackedLink className="button button-secondary" href={`tel:${site.phoneE164}`} event="call_click"><Phone size={17} /> Call us</TrackedLink></div></div></div></section>
    </main>
    <footer className="footer"><div className="shell footer-row"><a className="brand" href="#top"><span className="brand-mark">JH</span><span>JH Self Drive</span></a><span>© {new Date().getFullYear()} JH Self Drive · Ramanathapuram, Tamil Nadu</span><span>Drive responsibly. Follow local traffic rules.</span></div></footer>
    <StickyContactBar />
  </>;
}
