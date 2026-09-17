"use server";

import { getSupabaseAdmin } from "@/lib/supabase-server";
import { directBookingSchema, istTimestamp } from "@/lib/validation";
import { requestIpHash } from "@/lib/rate-limit";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";
import { createCustomerBookingMessage } from "@/lib/messages/templates";
import { queueMessageForBooking } from "@/lib/admin/messages";
import { notifyAdmins } from "@/lib/push/notify";
import { formatInr, formatIstDateTime } from "@/lib/messages/format";

export type BookingState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  whatsappUrl?: string;
  bookingId?: string;
  details?: {
    fullName: string;
    carName: string;
    pickupLabel: string;
    returnLabel: string;
    amountTotal: number;
    deposit: number;
    days: number;
  };
};

function rpcErrorMessage(message: string) {
  if (message.includes("RATE_LIMITED")) return "Too many booking requests from this connection. Please call or WhatsApp us directly.";
  if (message.includes("VEHICLE_UNAVAILABLE")) return "Sorry — that car was just taken for those dates. Please pick another car.";
  if (message.includes("VEHICLE_NOT_FOUND")) return "That car is no longer in our fleet. Please pick another car.";
  if (message.includes("INVALID_HANDOVER_RANGE")) return "Return date and time must be after pickup.";
  return "We could not save your booking online. Please call or WhatsApp us directly to secure your car.";
}

/**
 * Step 2 of the public booking flow. The client sends a vehicle id and a
 * window; the RPC re-checks availability under a row lock and computes the
 * price from the vehicle's own rate, so a tampered form cannot set its own
 * price or double-book a car.
 */
export async function submitDirectBooking(_: BookingState, formData: FormData): Promise<BookingState> {
  const parsed = directBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  if (Date.now() - data.startedAt < 2000) {
    return { ok: false, message: "Please wait a moment and try again." };
  }

  const startAtStr = istTimestamp(data.pickupAt);
  const endAtStr = istTimestamp(data.returnAt);

  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase.rpc("record_vehicle_booking", {
      p_phone: data.phone,
      p_full_name: data.fullName,
      p_city: data.city || "Ramanathapuram",
      p_vehicle_id: data.vehicleId,
      p_start_at: startAtStr,
      p_end_at: endAtStr,
      p_notes: data.notes || null,
      p_ip_hash: await requestIpHash(),
      p_session_id: data.sessionId,
    });

    if (error) {
      console.error("Direct booking RPC failed", error);
      return { ok: false, message: rpcErrorMessage(error.message || "") };
    }

    const row = (rows as Array<{ booking_id: string; amount_total: number; deposit: number; days: number }> | null)?.[0];
    if (!row) return { ok: false, message: rpcErrorMessage("") };

    // Log the acknowledgement so the admin sees it as outstanding rather than
    // assuming the customer has heard from us. Never fails the booking.
    await queueMessageForBooking(row.booking_id, { kind: "status", to: "requested" })
      .catch((error) => { console.error("Queueing the request acknowledgement failed", error); });

    const { data: vehicle } = await supabase.from("vehicles").select("display_name,model,registration_number").eq("id", data.vehicleId).maybeSingle();
    const carName = vehicle?.display_name || vehicle?.model || vehicle?.registration_number || "your car";

    const pickupLabel = formatIstDateTime(startAtStr);
    const returnLabel = formatIstDateTime(endAtStr);
    const amountTotal = Number(row.amount_total);
    const deposit = Number(row.deposit);

    // Push it to the operator's phone immediately. Also guarded: a failure to
    // notify must never lose the customer their booking.
    await notifyAdmins({
      dedupeKey: `request:${row.booking_id}`,
      kind: "request",
      title: "New booking request",
      body: `${data.fullName} · ${carName} · ${pickupLabel} · ${formatInr(Number(row.amount_total))}`,
      bookingId: row.booking_id,
    }).catch((error) => { console.error("Notifying admins of the new request failed", error); });

    return {
      ok: true,
      bookingId: row.booking_id,
      whatsappUrl: businessWhatsAppUrl(createCustomerBookingMessage({
        fullName: data.fullName,
        carName,
        startAtLabel: pickupLabel,
        endAtLabel: returnLabel,
        amountTotal,
        deposit,
        notes: data.notes,
      })),
      details: { fullName: data.fullName, carName, pickupLabel, returnLabel, amountTotal, deposit, days: Number(row.days) },
    };
  } catch (error) {
    console.error("Direct booking submission failed", error);
    return { ok: false, message: rpcErrorMessage("") };
  }
}
