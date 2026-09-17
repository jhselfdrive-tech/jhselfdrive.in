import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdmin } from "@/lib/ops/auth";
import { transitionBooking } from "@/lib/admin/data";
import { BOOKING_STATUSES, STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(1000).optional().default(""),
  vehicleId: z.union([z.literal(""), z.uuid()]).optional().default(""),
});

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

/**
 * Approve / decline / advance a booking from the phone.
 *
 * Goes through the same transitionBooking() the web panel uses, so the status
 * machine, the vehicle-availability re-check and the customer-message queueing
 * all apply identically — the app cannot take a shortcut the panel would not.
 */
type Context = { params: Promise<{ id: string }> };

export const POST = withAdmin<Context>(async (request, _admin, { params }) => {
  const { id } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  try {
    const result = await transitionBooking({
      bookingId: id,
      to: parsed.data.status as BookingStatus,
      note: parsed.data.note || undefined,
      vehicleId: parsed.data.vehicleId || undefined,
    });
    // Keep the web panel in step with what the phone just did.
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${id}`);

    return Response.json({
      ok: true,
      status: result.to,
      statusLabel: STATUS_LABEL[result.to],
      // The app shows this so the operator can send it from their phone.
      queuedMessage: result.message ? { id: result.message.id, body: result.message.body, phone: result.message.phone } : null,
    });
  } catch (error) {
    console.error("Ops transition failed", error);
    const code = errorCode(error);
    const status = code === "ILLEGAL_TRANSITION" || code === "VEHICLE_REQUIRED" || code === "VEHICLE_UNAVAILABLE" ? 409 : 500;
    const message = code === "ILLEGAL_TRANSITION" ? "That change is not allowed from the booking's current state."
      : code === "VEHICLE_REQUIRED" ? "Assign a vehicle first."
      : code === "VEHICLE_UNAVAILABLE" ? "That car is unavailable for these dates."
      : "Could not update this booking.";
    return Response.json({ error: message, code }, { status });
  }
});
