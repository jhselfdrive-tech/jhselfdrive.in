import Link from "next/link";
import { CalendarPlus, MessageCircle, Phone } from "lucide-react";
import { site } from "@/content/site";
import type { Enquiry } from "@/lib/admin/data";
import { StatusSelect } from "./StatusSelect";

export function EnquiryRow({ enquiry }: { enquiry: Enquiry }) {
  const car = site.fleet.find((item) => item.slug === enquiry.car_slug);
  const customer = enquiry.customer;
  const initials = (customer?.full_name || "Guest").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const whatsappText = encodeURIComponent(`Hi ${customer?.full_name || "there"}, following up on your ${car?.name || enquiry.car_slug} enquiry with JH Self Drive.`);
  return <tr><td><div className="admin-customer-cell"><span className="admin-avatar">{initials}</span><div><strong>{customer?.full_name || "Unnamed customer"}</strong><small>{customer?.phone}</small></div></div></td><td><strong>{car?.name || enquiry.car_slug}</strong><small style={{display:"block",color:"var(--muted)",marginTop:3}}>{enquiry.pickup_date} → {enquiry.return_date}</small></td><td>{new Date(enquiry.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td><td><StatusSelect id={enquiry.id} status={enquiry.status} /></td><td><div className="admin-row-actions"><a href={`https://wa.me/${customer?.phone.replace(/\D/g, "")}?text=${whatsappText}`} target="_blank" rel="noreferrer" aria-label="WhatsApp customer"><MessageCircle size={15} /></a><a href={`tel:${customer?.phone}`} aria-label="Call customer"><Phone size={15} /></a>{enquiry.status !== "converted" ? <Link className="admin-convert" href={`/admin/bookings?enquiry=${enquiry.id}`}><CalendarPlus size={14} /> Convert</Link> : null}</div></td></tr>;
}
