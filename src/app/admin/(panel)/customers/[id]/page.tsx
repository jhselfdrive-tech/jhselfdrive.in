import { notFound } from "next/navigation";
import { CalendarDays, CarFront, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { updateCustomerNotesAction } from "@/app/admin/actions/customers";
import { TagEditor } from "@/components/admin/TagEditor";
import { site } from "@/content/site";
import { getCustomer } from "@/lib/admin/data";
import { segmentLabels } from "@/lib/admin/segments";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCustomer(id);
  if (!data) notFound();

  const { customer, enquiries, bookings } = data;
  const initials = (customer.full_name || "Guest")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <>
    <div className="admin-page-head">
      <div>
        <span className="admin-overline">Customer profile</span>
        <h1>{customer.full_name || "Unnamed customer"}</h1>
        <p>Complete enquiry and booking relationship.</p>
      </div>
    </div>
    <div className="admin-profile-grid">
      <aside className="admin-profile-card">
        <span className="admin-profile-avatar">{initials}</span>
        <h2>{customer.full_name || "Unnamed customer"}</h2>
        <p>Customer since {new Date(customer.first_seen_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
        <div>{customer.segments.map((segment) => <span className={`admin-segment admin-segment-${segment}`} key={segment}>{segmentLabels[segment]}</span>)}</div>
        <div className="admin-profile-contact">
          <a href={`tel:${customer.phone}`}><Phone size={14} /> {customer.phone}</a>
          <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Open WhatsApp</a>
          {customer.email ? <a href={`mailto:${customer.email}`}><Mail size={14} /> {customer.email}</a> : null}
          <span><MapPin size={14} /> {customer.city || "Ramanathapuram"}</span>
        </div>
        <div className="admin-profile-stats">
          <div className="admin-profile-stat"><strong>{customer.enquiry_count}</strong><span>Enquiries</span></div>
          <div className="admin-profile-stat"><strong>{customer.completed_booking_count}</strong><span>Completed</span></div>
          <div className="admin-profile-stat"><strong>₹{customer.lifetime_value.toLocaleString("en-IN")}</strong><span>Lifetime</span></div>
        </div>
      </aside>
      <div className="admin-profile-main">
        <section className="admin-card">
          <div className="admin-card-head"><div><h2>Manual tags</h2><span className="admin-card-subtitle">Add offer or relationship labels, separated by commas.</span></div></div>
          <TagEditor customerId={customer.id} tags={customer.tags} />
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><h2>Private notes</h2><span className="admin-card-subtitle">Only administrators can see these notes.</span></div></div>
          <form action={updateCustomerNotesAction}>
            <input type="hidden" name="id" value={customer.id} />
            <textarea name="notes" defaultValue={customer.notes || ""} placeholder="Preferences, service notes or follow-up context…" style={{ width: "100%", minHeight: 95, padding: 12, border: "1px solid #dfe3df", borderRadius: 10, resize: "vertical" }} />
            <div className="admin-form-actions"><button className="admin-primary-button" type="submit">Save notes</button></div>
          </form>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><h2>Booking history</h2><span className="admin-card-subtitle">{bookings.length} recorded rentals</span></div></div>
          <div className="admin-history">
            {bookings.map((booking) => <div className="admin-history-item" key={booking.id}>
              <span className="admin-history-icon"><CarFront size={17} /></span>
              <div><strong>{site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug}</strong><small>{booking.start_date} → {booking.end_date} · {booking.status}</small></div>
              <strong className="admin-money">₹{Number(booking.amount_total).toLocaleString("en-IN")}</strong>
            </div>)}
            {!bookings.length ? <div className="admin-empty">No bookings yet.</div> : null}
          </div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><h2>Enquiry history</h2><span className="admin-card-subtitle">{enquiries.length} requests received</span></div></div>
          <div className="admin-history">
            {enquiries.map((enquiry) => <div className="admin-history-item" key={enquiry.id}>
              <span className="admin-history-icon"><CalendarDays size={17} /></span>
              <div><strong>{site.fleet.find((car) => car.slug === enquiry.car_slug)?.name || enquiry.car_slug}</strong><small>{enquiry.pickup_date} → {enquiry.return_date} · {enquiry.status}</small></div>
              <span>{new Date(enquiry.created_at).toLocaleDateString("en-IN")}</span>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  </>;
}
