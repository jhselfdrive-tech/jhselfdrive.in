import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, Clock3, MapPin, Phone } from "lucide-react";
import { site } from "@/content/site";

type Props = {
  title?: string;
  copy?: string;
  eyebrow?: string;
  /** Pre-filters the booking page to one category. */
  category?: string;
};

const points = [
  "No advance payment online — pay at vehicle pickup.",
  `${site.pricing.includedKm} included with transparent per-km rates.`,
  "See the real cars free on your dates before you book.",
];

/**
 * Entry point to the booking flow. The search itself lives on /booking, where
 * it gets the full width it needs — this band only sells the click.
 */
export function BookingSection({
  eyebrow = "Reserve your car",
  title = "Ready to drive? Check availability in seconds.",
  copy = "Tell us your dates on the booking page and we'll show you every car actually free for that window — photos, specs and the final price for your trip.",
  category,
}: Props) {
  const href = category ? `/booking?category=${category}` : "/booking";
  return (
    <section className="section booking" id="book">
      <div className="shell booking-grid">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="section-title">{title}</h2>
          <p className="section-copy">{copy}</p>
          <ul className="booking-points">
            {points.map((point) => <li key={point}><span><Check size={16} /></span>{point}</li>)}
          </ul>
          <div className="contact-card">
            <div className="contact-row"><Phone size={17} /> <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a></div>
            <div className="contact-row"><Clock3 size={17} /> {site.hours}</div>
            <div className="contact-row"><MapPin size={17} /> {site.address}</div>
          </div>
        </div>
        <div className="booking-cta-card">
          <span className="booking-cta-icon"><CalendarCheck size={30} /></span>
          <h3>Check availability</h3>
          <p>Pick your dates on the next screen and browse every available car in one full-width view.</p>
          <Link className="button button-teal booking-cta-button" href={href}>
            Book a car <ArrowRight size={18} />
          </Link>
          <small>Takes under a minute · no account needed</small>
        </div>
      </div>
    </section>
  );
}
