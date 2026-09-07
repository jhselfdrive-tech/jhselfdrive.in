import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, CircleDollarSign, IndianRupee, Route, ShieldCheck, UserRound } from "lucide-react";
import { updateBookingStatusAction } from "@/app/admin/actions/bookings";
import { BookingMediaPanel } from "@/components/admin/BookingMediaPanel";
import { BookingVehicleAssignment } from "@/components/admin/BookingVehicleAssignment";
import { HandoverForm } from "@/components/admin/HandoverForm";
import { MessageTemplates } from "@/components/admin/MessageTemplates";
import { MetricCard } from "@/components/admin/MetricCard";
import { ShareLinkPanel } from "@/components/admin/ShareLinkPanel";
import { site } from "@/content/site";
import { getBookingDetail, type BookingHandover } from "@/lib/admin/bookings";
import { checklistGaps, paymentSummary } from "@/lib/admin/checklist";
import { formatInr, formatIstDateTime, rentalDurationLabel } from "@/lib/messages/format";
import { isShareLinkUsable } from "@/lib/share/token";

export const dynamic = "force-dynamic";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBookingDetail(id);
  if (!data) notFound();

  const booking = data.booking;
  const customer = first(booking.customer);
  const vehicle = first(booking.vehicle);
  const delivery = data.handovers.find((item) => item.phase === "delivery");
  const returned = data.handovers.find((item) => item.phase === "return");
  const gaps = checklistGaps(data.checklist);
  const payments = paymentSummary({ ...data.checklist, amount_total: booking.amount_total });
  const activeLink = data.shareLinks.find((link) => isShareLinkUsable(link));
  const shareUrl = activeLink ? `${site.siteUrl.replace(/\/$/, "")}/r/${activeLink.token}` : null;
  const carLabel = site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug;
  const vehicleLabel = vehicle ? `${vehicle.display_name || vehicle.model || carLabel} · ${vehicle.registration_number}` : null;
  const timeline = [
    { key: "created", title: "Booking created", detail: `${booking.created_by || "Administrator"} · ${formatIstDateTime(booking.created_at)}` },
    ...(booking.enquiry_id ? [{ key: "converted", title: "Converted from enquiry", detail: "Customer enquiry linked to this rental" }] : []),
    ...data.handovers.map((handover: BookingHandover) => ({ key: handover.id, title: `${handover.phase === "delivery" ? "Delivery" : "Return"} checklist recorded`, detail: `${handover.recorded_by} · ${formatIstDateTime(handover.recorded_at)}` })),
  ];

  return <>
    <div className="admin-page-head admin-booking-head"><div><span className="admin-overline">Booking operations</span><h1>{customer?.full_name || "Unnamed customer"}</h1><p>{formatIstDateTime(booking.start_at)} → {formatIstDateTime(booking.end_at)}</p>{customer ? <Link className="admin-customer-link" href={`/admin/customers/${customer.id}`}><UserRound size={13} /> View customer profile</Link> : null}</div><span className={`admin-status admin-status-${booking.status}`}>{booking.status}</span></div>

    <section className="admin-metrics admin-booking-metrics">
      <MetricCard label="Rental amount" value={formatInr(payments.total)} detail={carLabel} icon={IndianRupee} color="#dce9ff" ink="#3a6ba7" />
      <MetricCard label="Collected / balance" value={formatInr(payments.collected)} detail={`${formatInr(payments.balance)} remaining`} icon={CircleDollarSign} color="#e0f1e8" />
      <MetricCard label="Deposit collected" value={formatInr(payments.deposit)} detail={`${formatInr(Number(booking.deposit))} expected`} icon={ShieldCheck} color="#eee5ff" ink="#734ca1" />
      <MetricCard label="Rental duration" value={rentalDurationLabel(booking.start_at, booking.end_at)} detail={`${formatIstDateTime(booking.start_at)} pickup`} icon={Route} color="#ffeadc" ink="#b95735" />
    </section>

    {!data.schemaReady ? <div className="admin-notice"><AlertTriangle size={18} /><div><strong>Phase 4 database setup is still required</strong><p>Apply <code>supabase/migrations/0004_handovers.sql</code> before saving checklists, media or customer share links.</p></div></div> : null}

    {gaps.length ? <div className="admin-notice admin-checklist-notice"><AlertTriangle size={18} /><div><strong>Checklist is informational and still has {gaps.length} gap{gaps.length === 1 ? "" : "s"}</strong><p>{gaps.join(" · ")}. Status changes remain available.</p></div></div> : null}

    <div className="admin-detail-columns admin-booking-columns">
      <div className="admin-detail-stack">
        <HandoverForm bookingId={booking.id} phase="delivery" handover={delivery} previousOdometer={vehicle?.odometer_km} />
        <details className="admin-return-details" open={Boolean(returned)}><summary><CalendarClock size={16} /> Return checklist</summary><HandoverForm bookingId={booking.id} phase="return" handover={returned} previousOdometer={delivery?.odometer_km ?? vehicle?.odometer_km} /></details>
      </div>
      <div className="admin-detail-stack">
        <section className="admin-form-card"><div className="admin-card-head"><div><h2>Status & deposit</h2><span className="admin-card-subtitle">Warnings never block an operational update.</span></div><Check size={18} /></div><form className="admin-booking-status-form" action={updateBookingStatusAction}><input type="hidden" name="id" value={booking.id} /><div className="admin-field"><label htmlFor="booking-detail-status">Booking status</label><select id="booking-detail-status" name="status" defaultValue={booking.status}><option value="confirmed">Confirmed</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><input type="hidden" name="depositReturned" value="false" /><label className="admin-check-field"><input name="depositReturned" value="true" type="checkbox" defaultChecked={booking.deposit_returned} /> Deposit returned</label><button className="admin-primary-button" type="submit"><Check size={14} /> Save status</button></form></section>
        <section className="admin-form-card"><div className="admin-card-head"><div><h2>Assigned vehicle</h2><span className="admin-card-subtitle">Availability is checked again when saving.</span></div></div><p className="admin-assigned-vehicle">{vehicleLabel || "No physical vehicle assigned"}</p><BookingVehicleAssignment bookingId={booking.id} categorySlug={booking.car_slug} startAt={booking.start_at} endAt={booking.end_at} vehicleId={booking.vehicle_id} /></section>
        <ShareLinkPanel bookingId={booking.id} siteUrl={site.siteUrl.replace(/\/$/, "")} activeLink={activeLink} />
      </div>
    </div>

    <section className="admin-card admin-booking-section"><div className="admin-card-head"><div><h2>Customer messages</h2><span className="admin-card-subtitle">Copy for SMS or open WhatsApp with the message prefilled.</span></div></div><MessageTemplates phone={customer?.phone || ""} context={{ customerName: customer?.full_name, carLabel, vehicleLabel, startAt: booking.start_at, endAt: booking.end_at, amountTotal: Number(booking.amount_total), amountBalance: payments.balance, depositAmount: Number(booking.deposit), shareUrl }} /></section>

    <BookingMediaPanel bookingId={booking.id} media={data.media} />

    <section className="admin-card admin-booking-section"><div className="admin-card-head"><div><h2>Booking timeline</h2><span className="admin-card-subtitle">A compact operational history</span></div></div><div className="admin-booking-timeline">{timeline.map((event) => <div key={event.key}><span /><section><strong>{event.title}</strong><small>{event.detail}</small></section></div>)}</div></section>
  </>;
}
