import Link from "next/link";
import { AlertTriangle, CalendarX2, CarFront, ClockAlert, FileWarning } from "lucide-react";
import type { getFleetAlerts } from "@/lib/admin/fleet";

type Alerts = Awaited<ReturnType<typeof getFleetAlerts>>;

export function AlertsPanel({ alerts }: { alerts: Alerts }) {
  const total = alerts.documents.length + alerts.overdue.length + alerts.unassigned.length + alerts.staleEnquiries.length + alerts.conflicts.length;
  if (!total) return <section className="admin-alerts admin-alerts-clear"><CarFront size={20} /><div><strong>Fleet operations are clear</strong><span>No urgent documents, returns, assignments or follow-ups.</span></div></section>;
  return <section className="admin-alerts">
    <div className="admin-alerts-title"><AlertTriangle size={18} /><div><strong>{total} item{total === 1 ? "" : "s"} need attention</strong><span>Operational risks and follow-ups</span></div></div>
    <div className="admin-alert-list">
      {alerts.documents.slice(0, 4).map((alert) => <Link href={`/admin/fleet/${alert.vehicle_id}`} className="admin-alert-row" key={`doc-${alert.id}`}><FileWarning size={16} /><span><strong>{alert.registration_number} · {alert.doc_type.replace("_", " ")}</strong><small>{alert.days_remaining < 0 ? `Expired ${Math.abs(alert.days_remaining)} days ago` : `Expires in ${alert.days_remaining} days`}</small></span></Link>)}
      {alerts.overdue.slice(0, 3).map((booking) => <Link href="/admin/bookings" className="admin-alert-row" key={`overdue-${booking.id}`}><ClockAlert size={16} /><span><strong>Overdue ongoing rental</strong><small>Return time passed {new Date(booking.end_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></span></Link>)}
      {alerts.unassigned.slice(0, 3).map((booking) => <Link href="/admin/bookings" className="admin-alert-row" key={`unassigned-${booking.id}`}><CalendarX2 size={16} /><span><strong>Confirmed booking has no vehicle</strong><small>{booking.car_slug} · starts {new Date(booking.start_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></span></Link>)}
      {alerts.staleEnquiries.slice(0, 3).map((enquiry) => <Link href="/admin/enquiries" className="admin-alert-row" key={`enquiry-${enquiry.id}`}><AlertTriangle size={16} /><span><strong>New enquiry waiting over 48 hours</strong><small>{enquiry.car_slug} · received {new Date(enquiry.created_at).toLocaleDateString("en-IN")}</small></span></Link>)}
      {alerts.conflicts.slice(0, 3).map((conflict) => <Link href={`/admin/fleet/${conflict.vehicleId}`} className="admin-alert-row" key={`conflict-${conflict.bookingId}`}><CalendarX2 size={16} /><span><strong>{conflict.registrationNumber} booking overlaps a block</strong><small>{conflict.reason} · review the allocation</small></span></Link>)}
    </div>
  </section>;
}
