import { withAdmin } from "@/lib/ops/auth";
import { getBookingDetail } from "@/lib/admin/bookings";
import { listBookingMessages } from "@/lib/admin/messages";
import { listPayments } from "@/lib/admin/payments";
import { paymentSummary } from "@/lib/admin/checklist";
import { STATUS_LABEL, nextStatuses, transitionLabel, type BookingStatus } from "@/lib/bookings/status";
import { site } from "@/content/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

type Context = { params: Promise<{ id: string }> };

export const GET = withAdmin<Context>(async (_request, _admin, { params }) => {
  const { id } = await params;

  const [detail, messages, ledger] = await Promise.all([
    getBookingDetail(id), listBookingMessages(id), listPayments(id),
  ]);
  if (!detail) return Response.json({ error: "Booking not found" }, { status: 404 });

  const booking = detail.booking;
  const customer = first(booking.customer);
  const vehicle = first(booking.vehicle);
  const status = booking.status as BookingStatus;
  const payments = paymentSummary({ ...detail.checklist, amount_total: booking.amount_total });
  const carLabel = site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug;

  return Response.json({
    id: booking.id,
    status,
    statusLabel: STATUS_LABEL[status] || status,
    customerName: customer?.full_name || "Unnamed customer",
    phone: customer?.phone || "",
    carLabel,
    vehicleLabel: vehicle ? `${vehicle.display_name || vehicle.model || carLabel} · ${vehicle.registration_number}` : null,
    startAt: booking.start_at,
    endAt: booking.end_at,
    notes: booking.notes,
    amountTotal: payments.total,
    collected: payments.collected,
    balance: payments.balance,
    deposit: payments.deposit,
    // Only the moves the status machine actually allows, so the app cannot
    // offer a button the server would reject.
    actions: nextStatuses(status).map((to) => ({ to, label: transitionLabel(status, to) })),
    dueMessages: messages.filter((message) => message.status === "due").length,
    payments: ledger.map((entry) => ({
      id: entry.id, kind: entry.kind, amount: entry.amount, method: entry.method, receivedAt: entry.received_at,
    })),
  }, { headers: { "cache-control": "no-store" } });
});
