import { first } from './serialize';
const DAY = 86_400_000;
type Entry = { id: string; vehicle_id: string | null; start_at: string; end_at: string; status?: string; reason?: string; customer?: { full_name: string | null } | { full_name: string | null }[] | null };
/** Zero-based day spans in IST. Pack rounded visual spans, not just clock overlap,
 * so two handovers on the same day never draw on top of each other. */
export function packCalendarLanes(vehicles: { id: string; registration_number: string; display_name: string | null }[], bookings: Entry[], blocks: Entry[], startDate: string, days: number) {
  const start = new Date(`${startDate}T00:00:00+05:30`).getTime(), end = start + days * DAY;
  if (!Number.isFinite(start) || !Number.isInteger(days) || days < 1 || days > 90) return [];
  return vehicles.map(vehicle => {
    const entries = [...bookings.filter(b => !['cancelled','rejected'].includes(b.status || '')).map(b => ({ ...b, kind: 'booking' as const })), ...blocks.map(b => ({ ...b, kind: 'block' as const }))];
    const ends: number[] = [];
    const spans = entries.filter(e => e.vehicle_id === vehicle.id).flatMap(e => {
      const a = new Date(e.start_at).getTime(), b = new Date(e.end_at).getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || a >= end || b <= start) return [];
      return [{ id: e.id, kind: e.kind, status: e.status ?? null, label: e.reason || first(e.customer)?.full_name || 'Booking', startDay: Math.floor((Math.max(a,start)-start)/DAY), endDay: Math.ceil((Math.min(b,end)-start)/DAY), startsBeforeWindow: a < start, endsAfterWindow: b > end }];
    }).sort((a,b) => a.startDay-b.startDay || a.endDay-b.endDay || a.id.localeCompare(b.id)).map(e => {
      let lane = ends.findIndex(end => end <= e.startDay);
      if (lane < 0) lane = ends.length;
      ends[lane] = e.endDay;
      return { ...e, lane, dayCount: e.endDay-e.startDay };
    });
    return { vehicleId: vehicle.id, label: vehicle.display_name || vehicle.registration_number, registrationNumber: vehicle.registration_number, laneCount: Math.max(1,ends.length), spans };
  });
}
