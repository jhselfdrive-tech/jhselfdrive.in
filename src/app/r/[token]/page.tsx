import type { Metadata } from "next";
import { FileCheck2, Phone, ShieldCheck } from "lucide-react";
import { site } from "@/content/site";
import { formatIstDateTime } from "@/lib/messages/format";
import { getSharedBooking } from "@/lib/share/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vehicle papers", robots: { index: false, follow: false, nocache: true } };

function InactiveShare() {
  return <main className="share-page"><section className="share-card share-inactive"><span className="share-icon"><ShieldCheck size={28} /></span><p className="share-kicker">JH Self Drive</p><h1>This link is no longer active.</h1><p>For a fresh vehicle document link, call us and we’ll help immediately.</p><a className="share-button" href={`tel:${site.phoneE164}`}><Phone size={16} /> Call {site.phoneDisplay}</a></section></main>;
}

export default async function SharedBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedBooking(token);
  if (!shared) return <InactiveShare />;
  const vehicle = Array.isArray(shared.booking.vehicle) ? shared.booking.vehicle[0] : shared.booking.vehicle;
  return <main className="share-page"><section className="share-card">
    <div className="share-brand"><span>JH</span><div><strong>{site.name}</strong><small>Vehicle papers</small></div></div>
    <p className="share-kicker">Active rental document access</p>
    <h1>{vehicle?.display_name || vehicle?.model || vehicle?.registration_number}</h1>
    <strong className="share-registration">{vehicle?.registration_number}</strong>
    <div className="share-window"><span><small>Pickup</small><strong>{formatIstDateTime(shared.booking.start_at)}</strong></span><i /><span><small>Return</small><strong>{formatIstDateTime(shared.booking.end_at)}</strong></span></div>
    <div className="share-documents"><h2>Vehicle documents</h2>{shared.documents.map((document) => <a href={`/r/${token}/d/${document.id}`} className="share-document" key={document.id}><span><FileCheck2 size={18} /></span><div><strong>{document.doc_type.replace("_", " ")}</strong><small>Valid through {new Date(document.expires_on).toLocaleDateString("en-IN")}</small></div><b>Open</b></a>)}{!shared.documents.length ? <p className="share-empty">No shareable documents are available. Call us if you need help roadside.</p> : null}</div>
    <p className="share-security"><ShieldCheck size={14} /> Files open through short-lived secure links. Customer and payment details are never shown here.</p>
    <a className="share-help" href={`tel:${site.phoneE164}`}><Phone size={14} /> Roadside help · {site.phoneDisplay}</a>
  </section></main>;
}
