import { withAdmin } from "@/lib/ops/auth";
import { listBookings } from "@/lib/admin/data";
import { STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";
import { site } from "@/content/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Booking list for the app. Returns a flattened shape rather than the raw rows
 * so the Swift models stay small and the API can change independently.
 */
export const GET = withAdmin(async (request) => {
  const status = new URL(request.url).searchParams.get("status") || "requested";
  const bookings = await listBookings({ status });

  return Response.json({
    bookings: bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      statusLabel: STATUS_LABEL[booking.status as BookingStatus] || booking.status,
      customerName: booking.customer?.full_name || "Unnamed customer",
      phone: booking.customer?.phone || "",
      carLabel: site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug,
      vehicleLabel: booking.vehicle?.display_name || booking.vehicle?.registration_number || null,
      startAt: booking.start_at,
      endAt: booking.end_at,
      amountTotal: Number(booking.amount_total),
      deposit: Number(booking.deposit),
      createdAt: booking.created_at,
    })),
  }, { headers: { "cache-control": "no-store" } });
});
