import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { FaqSection } from "@/components/sections/FaqSection";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

const path = "/outstation-self-drive-car-rental";
const crumbs = [{ name: "Home", path: "/" }, { name: "Outstation self-drive rentals", path }];
const districts = [
  { name: "Madurai", detail: "Share your city, airport or station itinerary and confirm the handover location before booking.", href: "/self-drive-car-rental-madurai" },
  { name: "Sivaganga", detail: "For a Karaikudi or other Sivaganga district trip, include each stop when requesting route approval." },
  { name: "Virudhunagar", detail: "Tell us whether you are visiting Virudhunagar, Aruppukkottai or continuing farther, so the full route can be checked." },
  { name: "Pudukkottai", detail: "For a visit to Pudukkottai district, share your destination and overnight plans to confirm the rental window." },
  { name: "Thoothukudi", detail: "Discuss your coastal or city itinerary, total rental days and return plan with the team." },
  { name: "Dindigul", detail: "Mention any onward hill travel explicitly. Permitted routes and rental terms must be confirmed in advance." },
];
const faq = [
  { question: "Can I take a self-drive car outside Ramanathapuram district?", answer: "Outstation travel is subject to the usage area agreed with our team. Send your full route, dates and planned stops before booking. Listing a destination here does not mean a local office or delivery service is available there." },
  { question: "Where do I collect and return the car?", answer: "The regular pickup base is Ramanathapuram (Ramnad). Confirm the exact handover and return location with the team. Delivery to another district and one-way rentals are not included by default." },
  { question: "What should I check for a multi-day self-drive rental?", answer: "Confirm the daily rate, included distance, extra-kilometre rate, fuel policy, refundable deposit, permitted drivers and return time. Include the complete outstation itinerary so the team can approve the usage area." },
];
export const metadata = pageMetadata({ title: "Outstation Self Drive Car Rental from Ramnad", description: "Plan outstation self-drive car hire from Ramanathapuram (Ramnad) for Madurai and nearby Tamil Nadu districts. Confirm routes, pickup and mileage with our team.", path });

export default function OutstationPage() {
  return <>
    <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faq)]} />
    <PageHero crumbs={crumbs} eyebrow="Trips beyond Ramnad" title="Outstation self-drive car rental from Ramanathapuram" lede="Plan a journey beyond the district with a car you drive yourself. Start from our Ramanathapuram base and confirm your full itinerary with the team." meta={["Pickup in Ramnad", "Routes subject to approval", "Daily rental options"]} />
    <section className="section"><div className="shell"><div className="fleet-head"><div><span className="eyebrow">Plan before you book</span><h2 className="section-title">Where are you headed?</h2></div><p className="section-copy">These are trip-planning enquiries, with availability and travel permissions confirmed individually. Pickup or delivery in these districts is not guaranteed.</p></div><div className="district-grid">{districts.map(district => <article className="district-card" key={district.name}><MapPin size={22} /><h3>{district.name}</h3><p>{district.detail}</p>{district.href ? <Link className="journey-text-link" href={district.href}>Madurai trip details <ArrowUpRight size={17} /></Link> : <a className="journey-text-link" href={businessWhatsAppUrl(`Hi JH Self Drive, I am planning a trip to ${district.name} district. Can you confirm the permitted route, dates and pickup arrangements?`)} target="_blank" rel="noreferrer">Ask about this route <ArrowUpRight size={17} /></a>}</article>)}</div></div></section>
    <section className="personal-help shell"><div><MapPin size={25} /><span><strong>Staying closer to Ramanathapuram?</strong><small>Explore our existing guides for Rameswaram, Paramakudi, Mandapam and Keelakarai.</small></span></div><Link className="journey-text-link" href="/#area">Explore local trips <ArrowUpRight size={18} /></Link></section>
    <FaqSection items={faq} title="Outstation rental questions." />
  </>;
}
