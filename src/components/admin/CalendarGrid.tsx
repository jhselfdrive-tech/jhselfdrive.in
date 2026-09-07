import Link from "next/link";
import { layoutCalendarBars } from "@/lib/admin/availability";

type CalendarVehicle = { id: string; registration_number: string; display_name: string | null; category_slug: string; status: string };
type CalendarBooking = { id: string; vehicle_id: string | null; start_at: string; end_at: string; status: string; customer: { full_name: string | null; phone: string } | { full_name: string | null; phone: string }[] | null };
type CalendarBlock = { id: string; vehicle_id: string; start_at: string; end_at: string; reason: string };

function dateLabel(startAt: string, offset: number) {
  const date = new Date(new Date(startAt).getTime() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric" }).format(date);
}

function personName(customer: CalendarBooking["customer"]) {
  const record = Array.isArray(customer) ? customer[0] : customer;
  return record?.full_name || record?.phone || "Booked";
}

function CalendarWindow({ vehicles, bookings, blocks, startAt, days }: {
  vehicles: CalendarVehicle[]; bookings: CalendarBooking[]; blocks: CalendarBlock[]; startAt: string; days: number;
}) {
  return <div className="admin-calendar-frame" style={{ "--calendar-days": days } as React.CSSProperties}>
    <div className="admin-calendar-header">
      <span className="admin-calendar-corner">Vehicle</span>
      <div className="admin-calendar-days">{Array.from({ length: days }, (_, index) => <span key={index}>{dateLabel(startAt, index)}</span>)}</div>
    </div>
    {vehicles.map((vehicle) => {
      const vehicleBookings = bookings.filter((booking) => booking.vehicle_id === vehicle.id).map((booking) => ({ ...booking, startAt: booking.start_at, endAt: booking.end_at }));
      const vehicleBlocks = blocks.filter((block) => block.vehicle_id === vehicle.id).map((block) => ({ ...block, startAt: block.start_at, endAt: block.end_at }));
      const bookingBars = layoutCalendarBars(vehicleBookings, startAt, days);
      const blockBars = layoutCalendarBars(vehicleBlocks, startAt, days);
      return <div className="admin-calendar-row" key={vehicle.id}>
        <Link className="admin-calendar-vehicle" href={`/admin/fleet/${vehicle.id}`}><strong>{vehicle.display_name || vehicle.registration_number}</strong><small>{vehicle.display_name ? `${vehicle.registration_number} · ${vehicle.status}` : vehicle.status}</small></Link>
        <div className="admin-calendar-track">
          <div className="admin-calendar-cells">{Array.from({ length: days }, (_, index) => <i key={index} />)}</div>
          {bookingBars.map((bar) => <Link
            href="/admin/bookings"
            className={`admin-calendar-bar admin-calendar-booking admin-calendar-${bar.status}`}
            style={{ left: `${((bar.startColumn - 1) / days) * 100}%`, width: `${(bar.span / days) * 100}%` }}
            title={`${personName(bar.customer)} · ${bar.status}`}
            key={bar.id}
          >{personName(bar.customer)}</Link>)}
          {blockBars.map((bar) => <span
            className="admin-calendar-bar admin-calendar-block"
            style={{ left: `${((bar.startColumn - 1) / days) * 100}%`, width: `${(bar.span / days) * 100}%` }}
            title={bar.reason}
            key={bar.id}
          >{bar.reason}</span>)}
        </div>
      </div>;
    })}
    {!vehicles.length ? <div className="admin-empty">Add a vehicle to start using the availability calendar.</div> : null}
  </div>;
}

export function CalendarGrid({ vehicles, bookings, blocks, startAt }: {
  vehicles: CalendarVehicle[]; bookings: CalendarBooking[]; blocks: CalendarBlock[]; startAt: string;
}) {
  return <>
    <div className="admin-calendar-desktop"><CalendarWindow vehicles={vehicles} bookings={bookings} blocks={blocks} startAt={startAt} days={30} /></div>
    <div className="admin-calendar-mobile"><CalendarWindow vehicles={vehicles} bookings={bookings} blocks={blocks} startAt={startAt} days={14} /></div>
    <div className="admin-calendar-legend"><span><i className="confirmed" /> Confirmed</span><span><i className="ongoing" /> Ongoing</span><span><i className="completed" /> Completed</span><span><i className="blocked" /> Blocked</span></div>
  </>;
}
