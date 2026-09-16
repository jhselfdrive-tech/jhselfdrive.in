import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarClock, CircleDollarSign, IndianRupee, Route, ShieldCheck, UserRound } from "lucide-react";
import { BookingMediaPanel } from "@/components/admin/BookingMediaPanel";
import { BookingTransitions } from "@/components/admin/BookingTransitions";
import { BookingVehicleAssignment } from "@/components/admin/BookingVehicleAssignment";
import { HandoverForm } from "@/components/admin/HandoverForm";
import { MessageTemplates } from "@/components/admin/MessageTemplates";
import { MetricCard } from "@/components/admin/MetricCard";
import { ShareLinkPanel } from "@/components/admin/ShareLinkPanel";
import { site } from "@/content/site";
import { getBookingDetail, type BookingHandover } from "@/lib/admin/bookings";
import { listBookingStatusEvents } from "@/lib/admin/data";
import { STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";
import { messageTemplates, type MessageTemplateId } from "@/lib/messages/templates";
import { checklistGaps, paymentSummary } from "@/lib/admin/checklist";
import { formatInr, formatIstDateTime, rentalDurationLabel } from "@/lib/messages/format";
import { isShareLinkUsable } from "@/lib/share/token";

export const dynamic = "force-dynamic";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, statusEvents] = await Promise.all([getBookingDetail(id), listBookingStatusEvents(id)]);
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
  const messageContext = {
    customerName: customer?.full_name, carLabel, vehicleLabel,
    startAt: booking.start_at, endAt: booking.end_at,
    amountTotal: Number(booking.amount_total), amountBalance: payments.balance,
    depositAmount: Number(booking.deposit), shareUrl,
  };
  const timeline = [
    ...statusEvents.map((event) => {
      const moved = event.from_status && event.from_status !== event.to_status;
      const template = event.message_template_id && event.message_template_id in messageTemplates
        ? messageTemplates[event.message_template_id as MessageTemplateId].label
        : null;
      return {
        key: event.id,
        title: moved
          ? `${STATUS_LABEL[event.from_status as BookingStatus] || event.from_status} → ${STATUS_LABEL[event.to_status as BookingStatus] || event.to_status}`
          : `Booking created as ${STATUS_LABEL[event.to_status as BookingStatus] || event.to_status}`,
        detail: [
          `${event.created_by} · ${formatIstDateTime(event.created_at)}`,
          event.note,
          event.message_sent_at ? `“${template || event.message_template_id}” sent ${formatIstDateTime(event.message_sent_at)}` : null,
        ].filter(Boolean).join(" · "),
        at: event.created_at,
      };
    }),
    ...data.handovers.map((handover: BookingHandover) => ({
      key: handover.id,
      title: `${handover.phase === "delivery" ? "Delivery" : "Return"} checklist recorded`,
      detail: `${handover.recorded_by} · ${formatIstDateTime(handover.recorded_at)}`,
      at: handover.recorded_at,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return <>
    <div className="admin-page-head admin-booking-head"><div><span className="admin-overline">Booking operations</span><h1>{customer?.full_name || "Unnamed customer"}</h1><p>{formatIstDateTime(booking.start_at)} → {formatIstDateTime(booking.end_at)}</p>{customer ? <Link className="admin-customer-link" href={`/admin/customers/${customer.id}`}><UserRound size={13} /> View customer profile</Link> : null}</div><span className={`admin-status admin-status-${booking.status}`}>{STATUS_LABEL[booking.status as BookingStatus] || booking.status}</span></div>

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
        <BookingTransitions
          booking={{
            id: booking.id, status: booking.status as BookingStatus, car_slug: booking.car_slug,
            start_at: booking.start_at, end_at: booking.end_at, vehicle_id: booking.vehicle_id,
            amount_total: Number(booking.amount_total), deposit: Number(booking.deposit),
            deposit_returned: booking.deposit_returned,
          }}
          phone={customer?.phone || ""}
          context={messageContext}
        />
        <section className="admin-form-card"><div className="admin-card-head"><div><h2>Assigned vehicle</h2><span className="admin-card-subtitle">Availability is checked again when saving.</span></div></div><p className="admin-assigned-vehicle">{vehicleLabel || "No physical vehicle assigned"}</p><BookingVehicleAssignment bookingId={booking.id} categorySlug={booking.car_slug} startAt={booking.start_at} endAt={booking.end_at} vehicleId={booking.vehicle_id} /></section>
        <ShareLinkPanel bookingId={booking.id} siteUrl={site.siteUrl.replace(/\/$/, "")} activeLink={activeLink} />
      </div>
    </div>

    <section className="admin-card admin-booking-section"><div className="admin-card-head"><div><h2>Customer messages</h2><span className="admin-card-subtitle">Ad-hoc messages. Lifecycle updates prompt their own message above.</span></div></div><MessageTemplates phone={customer?.phone || ""} context={messageContext} /></section>

    <BookingMediaPanel bookingId={booking.id} media={data.media} />

    <section className="admin-card admin-booking-section"><div className="admin-card-head"><div><h2>Booking timeline</h2><span className="admin-card-subtitle">A compact operational history</span></div></div><div className="admin-booking-timeline">{timeline.map((event) => <div key={event.key}><span /><section><strong>{event.title}</strong><small>{event.detail}</small></section></div>)}</div></section>
  </>;
}
