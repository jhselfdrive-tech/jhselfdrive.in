"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking, updateBookingStatus } from "@/lib/admin/data";

export type BookingActionState = { message?: string };

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid pickup and return time");

function toIstTimestamp(value: string) {
  return `${value}:00+05:30`;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

const bookingSchema = z.object({
  enquiryId: z.string().optional().default(""),
  customerId: z.string().optional().default(""),
  carSlug: z.string().min(1),
  vehicleId: z.union([z.literal(""), z.uuid()]).optional().default(""),
  startAt: localDateTime,
  endAt: localDateTime,
  amountTotal: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
  status: z.enum(["confirmed", "ongoing", "completed", "cancelled"]),
  notes: z.string().trim().max(1000).optional().default(""),
}).refine((value) => Boolean(value.enquiryId || value.customerId), { message: "A customer is required" })
  .refine((value) => new Date(toIstTimestamp(value.endAt)) > new Date(toIstTimestamp(value.startAt)), { message: "Return time must be after pickup time" });

export async function createBookingAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the booking details." };
  try {
    await createBooking({
      enquiryId: parsed.data.enquiryId || undefined,
      customerId: parsed.data.customerId || undefined,
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
    const code = errorCode(error);
    if (code === "23P01") return { message: "That car is already booked for those dates." };
    if (code === "VEHICLE_UNAVAILABLE" || code === "P0001") return { message: "That car is unavailable or blocked for those times." };
    return { message: "Could not create the booking. It may already have been converted." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
  redirect("/admin/bookings?created=1");
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "ongoing", "completed", "cancelled"]),
  depositReturned: z.string().optional(),
});

export async function updateBookingStatusAction(formData: FormData) {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const depositReturned = parsed.data.depositReturned === "true" ? true : parsed.data.depositReturned === "false" ? false : undefined;
  await updateBookingStatus(parsed.data.id, parsed.data.status, depositReturned);
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${parsed.data.id}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
}
