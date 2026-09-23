import { invalidateOps } from "@/lib/ops/http";
import { opsError } from "@/lib/ops/errors";
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
    invalidateOps();

    return Response.json({
      ok: true,
      status: result.to,
      statusLabel: STATUS_LABEL[result.to],
      // The app shows this so the operator can send it from their phone.
      queuedMessage: result.message ? { id: result.message.id, body: result.message.body, phone: result.message.phone } : null,
    });
  } catch (error) {
    console.error("Ops transition failed", error);
    const { status, message, code } = opsError(error);
    return Response.json({ error: message, code }, { status });
  }
});
