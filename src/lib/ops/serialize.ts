import { site } from '@/content/site';
import { STATUS_LABEL, nextStatuses, transitionLabel, type BookingStatus } from '@/lib/bookings/status';
import { checklistGaps, paymentSummary } from '@/lib/admin/checklist';
import type { Booking, CustomerSummary } from '@/lib/admin/data';
import type { getBookingDetail } from '@/lib/admin/bookings';
import type { BookingMessage } from '@/lib/admin/messages';
import type { BookingPayment } from '@/lib/bookings/payments';
import type { Vehicle } from '@/lib/admin/fleet';
export function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] || null : value ?? null; }
/** Explicit field selection keeps storage paths, audit internals and joins off the wire. */
export function bookingRow(row: Omit<Partial<Booking>, 'customer' | 'vehicle'> & { id: string; customer?: Booking['customer'] | Booking['customer'][]; vehicle?: Booking['vehicle'] | Booking['vehicle'][] }) {
  const customer = first(row.customer), vehicle = first(row.vehicle);
  return { id: row.id, status: row.status, statusLabel: STATUS_LABEL[row.status as BookingStatus] || row.status,
    customerId: row.customer_id, vehicleId: row.vehicle_id, carSlug: row.car_slug,
    customerName: customer?.full_name || 'Unnamed customer', phone: customer?.phone || '',
    carLabel: site.fleet.find(car => car.slug === row.car_slug)?.name || row.car_slug,
    vehicleLabel: vehicle?.display_name || vehicle?.registration_number || null,
    startAt: row.start_at, endAt: row.end_at, amountTotal: Number(row.amount_total || 0),
    deposit: Number(row.deposit || 0), createdAt: row.created_at,
    balance: row.checklist ? paymentSummary(row.checklist).balance : null };
}
export function paymentRow(row: BookingPayment) {
  return { id: row.id, kind: row.kind, amount: Number(row.amount), method: row.method, receivedAt: row.received_at, note: row.note, handoverId: row.handover_id };
}
export function messageRow(row: BookingMessage) { return { id: row.id, bookingId: row.booking_id, body: row.body, phone: row.phone, status: row.status, sentAt: row.sent_at, createdAt: row.created_at, skippedReason: row.skipped_reason }; }
export function customerRow(row: CustomerSummary) { return { id: row.id, phone: row.phone, fullName: row.full_name, email: row.email, city: row.city, tags: row.tags, notes: row.notes, bookingCount: row.booking_count, completedBookingCount: row.completed_booking_count, lifetimeValue: Number(row.lifetime_value), segments: row.segments, lastSeenAt: row.last_seen_at }; }
export function vehicleCard(row: Vehicle) { return { id: row.id, registrationNumber: row.registration_number, displayName: row.display_name, categorySlug: row.category_slug, model: row.model, year: row.year, transmission: row.transmission, fuel: row.fuel, seats: row.seats, status: row.status, odometerKm: row.odometer_km, acquiredOn: row.acquired_on, notes: row.notes, dayRate: Number(row.day_rate), kmRate: row.km_rate, includedKmPerDay: row.included_km_per_day, deposit: Number(row.deposit), tagline: row.tagline, description: row.description, isBookable: row.is_bookable }; }
export function bookingDetail(detail: NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>) {
  const row = detail.booking, customer = first(row.customer), vehicle = first(row.vehicle);
  const status = row.status as BookingStatus;
  const money = paymentSummary({ ...detail.checklist, amount_total: row.amount_total });
  const carLabel = site.fleet.find(car => car.slug === row.car_slug)?.name || row.car_slug;
  const c = detail.checklist;
  const link = detail.shareLinks.find(link => !link.revoked_at && new Date(link.expires_at) > new Date());
  return { id: row.id, status, statusLabel: STATUS_LABEL[status] || status,
    customerName: customer?.full_name || 'Unnamed customer', phone: customer?.phone || '', carLabel,
    vehicleLabel: vehicle ? `${vehicle.display_name || vehicle.model || carLabel} · ${vehicle.registration_number}` : null,
    startAt: row.start_at, endAt: row.end_at, notes: row.notes, amountTotal: money.total, collected: money.collected, balance: money.balance, deposit: money.deposit,
    actions: nextStatuses(status).map(to => ({ to, label: transitionLabel(status, to) })),
    customerId: row.customer_id, vehicleId: row.vehicle_id, carSlug: row.car_slug, depositReturned: row.deposit_returned,
    previousOdometerKm: vehicle?.odometer_km ?? null,
    checklist: { gaps: checklistGaps(c), hasDelivery: c?.has_delivery, hasReturn: c?.has_return, hasLicenceFront: c?.has_licence_front, hasLicenceBack: c?.has_licence_back, deliveryOdometerKm: c?.delivery_odometer_km, returnOdometerKm: c?.return_odometer_km, deliveryFuelEighths: c?.delivery_fuel_eighths, returnFuelEighths: c?.return_fuel_eighths },
    handovers: detail.handovers.map(h => ({ id: h.id, phase: h.phase, odometerKm: h.odometer_km, fuelEighths: h.fuel_eighths, paymentReceived: h.payment_received, paymentAmount: Number(h.payment_amount), depositAmount: Number(h.deposit_amount), damageNotes: h.damage_notes, notes: h.notes, recordedAt: h.recorded_at })),
    media: detail.media.map(m => ({ id: m.id, phase: m.phase, mediaType: m.media_type, fileName: m.file_name, url: m.signedUrl ?? null, requiresReveal: m.media_type !== 'vehicle_condition' })),
    shareLink: link ? { url: `/r/${link.token}`, expiresAt: link.expires_at } : null };
}
