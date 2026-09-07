import { Check, Filter, RotateCcw } from "lucide-react";
import { updateBookingStatusAction } from "@/app/admin/actions/bookings";
import { BookingForm } from "@/components/admin/BookingForm";
import { BookingVehicleAssignment } from "@/components/admin/BookingVehicleAssignment";
import { site } from "@/content/site";
import { getEnquiry, listBookings } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

function handoverLabel(timestamp: string | undefined, fallbackDate: string) {
  if (!timestamp) return fallbackDate;
  return new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" ? raw.status : "all";
  const enquiryId = typeof raw.enquiry === "string" ? raw.enquiry : "";
  const [bookings, enquiry] = await Promise.all([listBookings({ status }), enquiryId ? getEnquiry(enquiryId) : Promise.resolve(null)]);

  return <>
    <div className="admin-page-head"><div><span className="admin-overline">Rental records</span><h1>Bookings</h1><p>Exact handovers, vehicle assignments and completed revenue.</p></div></div>
    {enquiry ? <div style={{ marginBottom: 16 }}><BookingForm enquiry={enquiry} /></div> : null}
    {raw.created === "1" ? <p className="admin-form-success">Booking created and enquiry marked converted.</p> : null}
    <form className="admin-filters"><div className="admin-filter"><label htmlFor="booking-filter">Status</label><select id="booking-filter" name="status" defaultValue={status}><option value="all">All bookings</option><option value="confirmed">Confirmed</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><button className="admin-primary-button" type="submit"><Filter size={14} /> Apply</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Category & handover</th><th>Physical vehicle</th><th>Amount</th><th>Deposit</th><th>Status</th><th>Update</th></tr></thead><tbody>
      {bookings.map((booking) => {
        const initials = (booking.customer?.full_name || "Guest").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        const carName = site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug;
        return <tr key={booking.id}>
          <td><div className="admin-customer-cell"><span className="admin-avatar">{initials}</span><div><strong>{booking.customer?.full_name || "Unnamed customer"}</strong><small>{booking.customer?.phone}</small></div></div></td>
          <td><strong>{carName}</strong><small className="admin-table-detail">{handoverLabel(booking.start_at, booking.start_date)} → {handoverLabel(booking.end_at, booking.end_date)}</small></td>
          <td><strong>{booking.vehicle?.display_name || booking.vehicle?.registration_number || "Unassigned"}</strong>{booking.vehicle ? <small className="admin-table-detail">{booking.vehicle.registration_number}</small> : <small className="admin-table-warning">Assign before pickup</small>}{booking.start_at && booking.end_at ? <details className="admin-assignment"><summary>{booking.vehicle ? "Change" : "Assign vehicle"}</summary><BookingVehicleAssignment bookingId={booking.id} categorySlug={booking.car_slug} startAt={booking.start_at} endAt={booking.end_at} vehicleId={booking.vehicle_id} /></details> : null}</td>
          <td className="admin-money">₹{Number(booking.amount_total).toLocaleString("en-IN")}</td>
          <td>₹{Number(booking.deposit).toLocaleString("en-IN")}<small className="admin-table-detail">{booking.deposit_returned ? "Returned" : "Held"}</small></td>
          <td><span className={`admin-status admin-status-${booking.status}`}>{booking.status}</span></td>
          <td><form className="admin-inline-form" action={updateBookingStatusAction}><input type="hidden" name="id" value={booking.id} /><select name="status" defaultValue={booking.status}><option value="confirmed">Confirmed</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>{!booking.deposit_returned && booking.deposit > 0 ? <button className="admin-icon-button" name="depositReturned" value="true" type="submit" title="Save and mark deposit returned"><RotateCcw size={13} /></button> : <button className="admin-icon-button" type="submit" title="Save status"><Check size={13} /></button>}</form></td>
        </tr>;
      })}
    </tbody></table>{!bookings.length ? <div className="admin-empty">No bookings in this view.</div> : null}</div>
  </>;
}
