"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking, setDepositReturned, transitionBooking } from "@/lib/admin/data";
import { BOOKING_STATUSES, STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";
import type { QueuedMessage } from "@/lib/admin/messages";

export type BookingActionState = {
  message?: string;
  success?: boolean;
  /** Queued customer message to prompt for, when one is outstanding. */
  queued?: QueuedMessage;
  bookingId?: string;
};

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid pickup and return time");

function toIstTimestamp(value: string) {
  return `${value}:00+05:30`;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function transitionMessage(error: unknown) {
  switch (errorCode(error)) {
    case "ILLEGAL_TRANSITION": return "That status change is not allowed from the booking's current state. Reload the page and try again.";
    case "VEHICLE_REQUIRED": return "Assign a vehicle before moving the booking to this status.";
    case "VEHICLE_UNAVAILABLE": return "That car is unavailable or blocked for these dates.";
    case "BOOKING_NOT_FOUND": return "That booking no longer exists.";
    case "23P01": return "That car is already booked for those dates.";
    default: return "Could not update this booking.";
  }
}

function revalidateBooking(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
  revalidatePath("/");
}

const bookingSchema = z.object({
  customerId: z.uuid({ error: "A customer is required" }),
  carSlug: z.string().min(1),
  vehicleId: z.union([z.literal(""), z.uuid()]).optional().default(""),
  startAt: localDateTime,
  endAt: localDateTime,
  amountTotal: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
  status: z.enum(BOOKING_STATUSES),
  notes: z.string().trim().max(1000).optional().default(""),
}).refine((value) => new Date(toIstTimestamp(value.endAt)) > new Date(toIstTimestamp(value.startAt)), { message: "Return time must be after pickup time" });

export async function createBookingAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the booking details." };
  try {
    await createBooking({
      customerId: parsed.data.customerId,
      carSlug: parsed.data.carSlug,
      vehicleId: parsed.data.vehicleId || undefined,
      startAt: toIstTimestamp(parsed.data.startAt),
      endAt: toIstTimestamp(parsed.data.endAt),
      amountTotal: parsed.data.amountTotal,
      deposit: parsed.data.deposit,
      status: parsed.data.status,
      notes: parsed.data.notes,
    });
  } catch (error) {
    console.error("Booking creation failed", error);
    return { message: transitionMessage(error) };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
  redirect("/admin/bookings?created=1");
}

const transitionSchema = z.object({
  id: z.uuid(),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(1000).optional().default(""),
  vehicleId: z.union([z.literal(""), z.uuid()]).optional().default(""),
  amountTotal: z.union([z.literal(""), z.coerce.number().min(0)]).optional().default(""),
  deposit: z.union([z.literal(""), z.coerce.number().min(0)]).optional().default(""),
});

export async function transitionBookingAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the details and try again." };
  const { id, status, note, vehicleId, amountTotal, deposit } = parsed.data;
  try {
    const result = await transitionBooking({
      bookingId: id,
      to: status as BookingStatus,
      note: note || undefined,
      vehicleId: vehicleId || undefined,
      amountTotal: amountTotal === "" ? undefined : Number(amountTotal),
      deposit: deposit === "" ? undefined : Number(deposit),
    });
    revalidateBooking(id);
    return {
      success: true,
      bookingId: id,
      queued: result.message || undefined,
      message: `Booking marked ${STATUS_LABEL[result.to].toLowerCase()}.`,
    };
  } catch (error) {
    console.error("Booking transition failed", error);
    return { message: transitionMessage(error), bookingId: id };
  }
}

const depositSchema = z.object({ id: z.uuid(), depositReturned: z.enum(["true", "false"]) });

export async function setDepositReturnedAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = depositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Could not update the deposit." };
  let queued: QueuedMessage | null = null;
  try {
    queued = await setDepositReturned(parsed.data.id, parsed.data.depositReturned === "true");
  } catch (error) {
    console.error("Deposit update failed", error);
    return { message: "Could not update the deposit." };
  }
  revalidateBooking(parsed.data.id);
  return {
    success: true,
    bookingId: parsed.data.id,
    queued: queued || undefined,
    message: parsed.data.depositReturned === "true" ? "Deposit returned and logged." : "Deposit marked as held.",
  };
}

// Message send/skip now lives in actions/messages.ts, against the
// booking_messages log rather than a stamp on the last status event.
