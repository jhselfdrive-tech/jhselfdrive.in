import Link from "next/link";
import { AlertTriangle, ArrowRight, Filter } from "lucide-react";
import { BookingVehicleAssignment } from "@/components/admin/BookingVehicleAssignment";
import { site } from "@/content/site";
import { listBookings } from "@/lib/admin/data";
import { checklistGaps } from "@/lib/admin/checklist";
import { BOOKING_STATUSES, STATUS_LABEL, nextStatuses, type BookingStatus } from "@/lib/bookings/status";

export const dynamic = "force-dynamic";

function handoverLabel(timestamp: string | undefined, fallbackDate: string) {
  if (!timestamp) return fallbackDate;
  return new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" ? raw.status : "all";
  const bookings = await listBookings({ status });

  return <>
    <div className="admin-page-head"><div><span className="admin-overline">Rental records</span><h1>Bookings</h1><p>Requests, approvals, handovers and completed revenue.</p></div></div>
    {raw.created === "1" ? <p className="admin-form-success">Booking created.</p> : null}
    <form className="admin-filters">
      <div className="admin-filter">
        <label htmlFor="booking-filter">Status</label>
        <select id="booking-filter" name="status" defaultValue={status}>
          <option value="all">All bookings</option>
          {BOOKING_STATUSES.map((value) => <option value={value} key={value}>{STATUS_LABEL[value]}</option>)}
        </select>
      </div>
      <button className="admin-primary-button" type="submit"><Filter size={14} /> Apply</button>
    </form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Category &amp; handover</th><th>Physical vehicle</th><th>Amount</th><th>Deposit</th><th>Status</th><th>Next step</th></tr></thead><tbody>
      {bookings.map((booking) => {
        const initials = (booking.customer?.full_name || "Guest").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        const carName = site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug;
        const gaps = checklistGaps(booking.checklist);
        const bookingStatus = booking.status as BookingStatus;
        const next = nextStatuses(bookingStatus);
        return <tr key={booking.id}>
          <td><Link href={`/admin/bookings/${booking.id}`} className="admin-customer-cell"><span className="admin-avatar">{initials}</span><div><strong>{booking.customer?.full_name || "Unnamed customer"}</strong><small>{booking.customer?.phone}</small></div></Link></td>
          <td><Link href={`/admin/bookings/${booking.id}`}><strong>{carName}</strong><small className="admin-table-detail">{handoverLabel(booking.start_at, booking.start_date)} → {handoverLabel(booking.end_at, booking.end_date)}</small>{gaps.length ? <small className="admin-table-warning admin-gap-warning"><AlertTriangle size={11} /> {gaps.length} checklist gap{gaps.length === 1 ? "" : "s"}</small> : null}</Link></td>
          <td>
            <strong>{booking.vehicle?.display_name || booking.vehicle?.registration_number || "Unassigned"}</strong>
            {booking.vehicle ? <small className="admin-table-detail">{booking.vehicle.registration_number}</small> : <small className="admin-table-warning">Assign before pickup</small>}
            {booking.start_at && booking.end_at ? <details className="admin-assignment"><summary>{booking.vehicle ? "Change" : "Assign vehicle"}</summary><BookingVehicleAssignment bookingId={booking.id} categorySlug={booking.car_slug} startAt={booking.start_at} endAt={booking.end_at} vehicleId={booking.vehicle_id} /></details> : null}
          </td>
          <td className="admin-money">₹{Number(booking.amount_total).toLocaleString("en-IN")}</td>
          <td>₹{Number(booking.deposit).toLocaleString("en-IN")}<small className="admin-table-detail">{booking.deposit_returned ? "Returned" : "Held"}</small></td>
          <td><span className={`admin-status admin-status-${booking.status}`}>{STATUS_LABEL[bookingStatus] || booking.status}</span></td>
          <td>
            {next.length
              ? <Link href={`/admin/bookings/${booking.id}`} className="admin-secondary-button admin-compact-button">Review <ArrowRight size={13} /></Link>
              : <small className="admin-table-detail">Closed</small>}
          </td>
        </tr>;
      })}
    </tbody></table>{!bookings.length ? <div className="admin-empty">No bookings in this view.</div> : null}</div>
  </>;
}
