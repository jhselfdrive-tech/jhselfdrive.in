import { site } from "@/content/site";

export function waDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function whatsAppUrl(phone: string, text?: string) {
  const base = `https://wa.me/${waDigits(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function businessWhatsAppUrl(text?: string) {
  return whatsAppUrl(site.whatsappNumber, text);
}
