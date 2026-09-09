import { Clock3, MapPin, Phone } from "lucide-react";
import { site, type CarSlug } from "@/content/site";
import { EnquiryForm } from "@/components/EnquiryForm";

type Props = { title?: string; copy?: string; eyebrow?: string; defaultCarSlug?: CarSlug };

export function EnquirySection({ eyebrow = "Check availability", title = "Where are you heading next?", copy = "Send your dates in under a minute. We’ll save your request and open WhatsApp so you can continue the conversation.", defaultCarSlug }: Props) {
  return <section className="section enquiry" id="enquire"><div className="shell enquiry-grid"><div><span className="eyebrow">{eyebrow}</span><h2 className="section-title">{title}</h2><p className="section-copy">{copy}</p><div className="contact-card"><div className="contact-row"><Phone size={17} /> <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a></div><div className="contact-row"><Clock3 size={17} /> {site.hours}</div><div className="contact-row"><MapPin size={17} /> {site.address}</div></div></div><EnquiryForm defaultCarSlug={defaultCarSlug} /></div></section>;
}
