"use client";

import { MessageCircle, Phone } from "lucide-react";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export function StickyContactBar() {
  return <div className="sticky-contact" aria-label="Quick contact"><a className="button sticky-call" href={`tel:${site.phoneE164}`} onClick={() => track("call_click")}><Phone size={17} /> Call</a><a className="button button-teal" href={businessWhatsAppUrl()} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click")}><MessageCircle size={17} /> WhatsApp</a></div>;
}
