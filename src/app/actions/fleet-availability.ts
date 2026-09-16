"use server";

import { listBookableVehicles, type BookableVehicle } from "@/lib/fleet/public";
import { formatIstDateTime } from "@/lib/messages/format";
import { availabilitySchema, istTimestamp } from "@/lib/validation";

export type AvailabilityState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  vehicles?: BookableVehicle[];
  window?: { startAt: string; endAt: string; pickupLabel: string; returnLabel: string };
};

/**
 * Step 1 of the public booking flow: which real cars are free for this window.
 * Runs without an admin session, so it returns only what a booking card shows.
 */
export async function getAvailableFleetAction(_: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  const parsed = availabilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please check the pickup and return times.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const startAt = istTimestamp(parsed.data.pickupAt);
  const endAt = istTimestamp(parsed.data.returnAt);

  try {
    const vehicles = await listBookableVehicles(startAt, endAt);
    return {
      ok: true,
      vehicles,
      window: { startAt, endAt, pickupLabel: formatIstDateTime(startAt), returnLabel: formatIstDateTime(endAt) },
      message: vehicles.length ? undefined : "No cars are free for those dates. Try nearby dates or message us on WhatsApp.",
    };
  } catch (error) {
    console.error("Fleet availability lookup failed", error);
    return { ok: false, message: "We could not check availability just now. Please call or WhatsApp us." };
  }
}
