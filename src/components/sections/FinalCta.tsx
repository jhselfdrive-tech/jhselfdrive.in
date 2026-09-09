import { CalendarCheck, Phone } from "lucide-react";
import { site } from "@/content/site";
import { TrackedLink } from "@/components/TrackedLink";

type Props = { title?: string; copy?: string };

export function FinalCta({ title = "Plans made? Let’s find your car.", copy = "A quick message is all it takes to get started." }: Props) {
  return <section className="final-cta"><div className="shell"><div className="cta-panel"><div><h2>{title}</h2><p>{copy}</p></div><div className="cta-buttons"><a className="button button-primary" href="#enquire"><CalendarCheck size={17} /> Check availability</a><TrackedLink className="button button-secondary" href={`tel:${site.phoneE164}`} event="call_click"><Phone size={17} /> Call us</TrackedLink></div></div></div></section>;
}
