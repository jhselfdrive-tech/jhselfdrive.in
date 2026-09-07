import { notFound } from "next/navigation";
import { AlertTriangle, CalendarClock, CarFront, FileCheck2, Gauge, IndianRupee, Wrench } from "lucide-react";
import { BlockForm } from "@/components/admin/BlockForm";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { MetricCard } from "@/components/admin/MetricCard";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { getVehicle } from "@/lib/admin/fleet";

export const dynamic = "force-dynamic";

function expiryState(expiresOn: string) {
  const days = Math.ceil((new Date(`${expiresOn}T00:00:00+05:30`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, className: "expired" };
  if (days <= 30) return { label: `${days}d remaining`, className: "warning" };
  return { label: `Valid to ${new Date(expiresOn).toLocaleDateString("en-IN")}`, className: "valid" };
}

export default async function VehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const data = await getVehicle(id);
  if (!data) notFound();
  const { vehicle, documents, blocks, bookings, utilisation, revenue } = data;
  return <>
    <div className="admin-page-head"><div><span className="admin-overline">{vehicle.registration_number}</span><h1>{vehicle.display_name || vehicle.model || "Vehicle profile"}</h1><p>Specs, compliance, downtime and rental performance.</p></div><span className={`admin-fleet-status admin-fleet-${vehicle.status}`}>{vehicle.status}</span></div>
    {query.created === "1" ? <p className="admin-form-success">Vehicle added. Add its current documents and any known maintenance blocks below.</p> : null}
    <section className="admin-metrics admin-vehicle-metrics">
      <MetricCard label="90-day utilisation" value={`${utilisation}%`} detail="Booked time in the last 90 days" icon={Gauge} color="#dce9ff" ink="#3a6ba7" />
      <MetricCard label="Completed revenue" value={`₹${revenue.toLocaleString("en-IN")}`} detail="All recorded completed rentals" icon={IndianRupee} color="#e0f1e8" />
      <MetricCard label="Bookings" value={String(bookings.length)} detail="Complete vehicle history" icon={CalendarClock} color="#ffeadc" ink="#b95735" />
      <MetricCard label="Documents" value={String(documents.length)} detail="Renewal records retained" icon={FileCheck2} color="#eee5ff" ink="#734ca1" />
    </section>
    <div className="admin-detail-columns">
      <VehicleForm vehicle={vehicle} />
      <div className="admin-detail-stack"><DocumentForm vehicleId={vehicle.id} /><BlockForm vehicleId={vehicle.id} /></div>
    </div>
    <section className="admin-card">
      <div className="admin-card-head"><div><h2>Compliance documents</h2><span className="admin-card-subtitle">Renewal history, newest expiry first</span></div></div>
      <div className="admin-document-grid">{documents.map((document) => { const state = expiryState(document.expires_on); return <article className="admin-document-card" key={document.id}><span className={`admin-expiry-chip admin-expiry-${state.className}`}>{state.className === "expired" ? <AlertTriangle size={12} /> : <FileCheck2 size={12} />}{state.label}</span><h3>{document.doc_type.replace("_", " ")}</h3><strong>{document.reference_number || "No reference"}</strong><small>{document.provider || "Provider not recorded"}</small></article>; })}{!documents.length ? <div className="admin-empty">No documents recorded.</div> : null}</div>
    </section>
    <div className="admin-detail-columns">
      <section className="admin-card"><div className="admin-card-head"><div><h2>Availability blocks</h2><span className="admin-card-subtitle">Maintenance and off-road periods</span></div><Wrench size={18} /></div><div className="admin-history">{blocks.map((block) => <div className="admin-history-item" key={block.id}><span className="admin-history-icon"><Wrench size={15} /></span><div><strong>{block.reason}</strong><small>{new Date(block.start_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} → {new Date(block.end_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></div></div>)}{!blocks.length ? <div className="admin-empty">No availability blocks.</div> : null}</div></section>
      <section className="admin-card"><div className="admin-card-head"><div><h2>Booking history</h2><span className="admin-card-subtitle">Revenue and utilisation source</span></div><CarFront size={18} /></div><div className="admin-history">{bookings.map((booking) => { const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer; return <div className="admin-history-item" key={booking.id}><span className="admin-history-icon"><CarFront size={15} /></span><div><strong>{customer?.full_name || customer?.phone || "Customer"}</strong><small>{new Date(booking.start_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} → {new Date(booking.end_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {booking.status}</small></div><strong className="admin-money">₹{Number(booking.amount_total).toLocaleString("en-IN")}</strong></div>; })}{!bookings.length ? <div className="admin-empty">No bookings assigned yet.</div> : null}</div></section>
    </div>
  </>;
}
