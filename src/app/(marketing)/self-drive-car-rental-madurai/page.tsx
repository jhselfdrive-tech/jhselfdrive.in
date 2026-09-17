import Link from "next/link";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { FaqSection } from "@/components/sections/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";
import { site } from "@/content/site";

const path = "/self-drive-car-rental-madurai";
const crumbs = [{ name: "Home", path: "/" }, { name: "Outstation trips", path: "/outstation-self-drive-car-rental" }, { name: "Madurai", path }];
const faq = [
  { question: "Can I rent a self-drive car for a Madurai trip?", answer: "Contact JH Self Drive with your pickup and return dates and your Madurai itinerary. Our team confirms whether the route is permitted, the available car and the rental terms before you book. Our regular pickup base is Ramanathapuram." },
  { question: "Do you have a pickup office in Madurai?", answer: "Our published pickup base is Ramanathapuram (Ramnad). Madurai airport, railway station or hotel delivery is not included by default. Ask our team whether an alternative handover can be arranged for your dates and what it would cost." },
  { question: "How is the price for an outstation rental calculated?", answer: "The booking search shows the car's daily rate, rental duration and rental total. The included distance is 250 km per day. Fuel, refundable deposit and any agreed extra-kilometre or delivery charges should be checked separately with our team." },
];
export const metadata = pageMetadata({ title: "Self Drive Car Rental for Madurai Trips", description: "Plan a Madurai self-drive trip with JH Self Drive. Ramanathapuram pickup; confirm your route, car, mileage and any delivery arrangements before booking.", path });

export default function MaduraiPage() {
  return <>
    <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faq)]} />
    <PageHero crumbs={crumbs} eyebrow="Plan your outstation journey" title="Self-drive car rental for Madurai trips" lede="A family visit, an appointment or a few days away. Share your Madurai plans and we’ll help you check the car, route and pickup arrangements." meta={["Ramanathapuram pickup", "Route confirmation required", "Pay at pickup"]} />
    <section className="section"><div className="shell essentials-layout"><div className="copy-block"><span className="eyebrow">Before you set off</span><h2 className="section-title">A clear plan for your Madurai rental.</h2><p>Start with your pickup and return times, then tell us where in Madurai you need to go. Include any airport, station or onward travel in your itinerary so the rental team can check the full journey.</p><p>JH Self Drive is based in Ramanathapuram, also known as Ramnad. If you are already in Madurai, confirm the handover location before reserving a car. Delivery and one-way returns need a separate agreement.</p><ul className="tick-list"><li><Check size={18} /> Confirm the full route and return location</li><li><Check size={18} /> Allow time for pickup and document checks</li><li><Check size={18} /> Check fuel, mileage and deposit terms</li></ul></div><aside className="rental-receipt"><MapPin size={25} /><h3>Let&apos;s check your route.</h3><p>Tell us your dates, passenger count and the places you plan to visit.</p><a className="button button-teal" href={businessWhatsAppUrl("Hi JH Self Drive, I am planning a Madurai trip. Please help me confirm the route, availability and pickup arrangements.")} target="_blank" rel="noreferrer">Ask about a Madurai trip <ArrowUpRight size={17} /></a><p>Prefer a call? <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a></p></aside></div></section>
    <section className="section booking"><div className="shell"><span className="eyebrow">Choose the right space</span><h2 className="section-title">A car for the people coming with you.</h2><div className="destination-grid">{site.fleet.map(car => <Link className="destination-card" key={car.slug} href={`/cars/${car.slug}`}><span className="destination-number">{car.seats} SEATS</span><ArrowUpRight size={22} /><div><h3>{car.name}</h3><p>{car.example} · From ₹{car.dayRate.toLocaleString("en-IN")}/day</p></div></Link>)}</div></div></section>
    <FaqSection items={faq} title="Madurai trip questions." />
  </>;
}
