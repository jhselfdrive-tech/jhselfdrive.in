"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking, updateBookingStatus } from "@/lib/admin/data";

export type BookingActionState = { message?: string };

const bookingSchema = z.object({
  enquiryId: z.string().optional().default(""), customerId: z.string().optional().default(""), carSlug: z.string().min(1),
  startDate: z.iso.date(), endDate: z.iso.date(), amountTotal: z.coerce.number().min(0), deposit: z.coerce.number().min(0),
  status: z.enum(["confirmed", "ongoing", "completed", "cancelled"]), notes: z.string().trim().max(1000).optional().default(""),
}).refine((value) => Boolean(value.enquiryId || value.customerId), { message: "A customer is required" }).refine((value) => value.endDate >= value.startDate, { message: "End date must be on or after the start date" });

export async function createBookingAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the booking details." };
  try {
    await createBooking({
      enquiryId: parsed.data.enquiryId || undefined, customerId: parsed.data.customerId || undefined, carSlug: parsed.data.carSlug,
      startDate: parsed.data.startDate, endDate: parsed.data.endDate, amountTotal: parsed.data.amountTotal,
      deposit: parsed.data.deposit, status: parsed.data.status, notes: parsed.data.notes,
    });
  } catch (error) {
    console.error("Booking creation failed", error);
    return { message: "Could not create the booking. It may already have been converted." };
  }
  revalidatePath("/admin"); revalidatePath("/admin/enquiries"); revalidatePath("/admin/bookings"); revalidatePath("/admin/customers");
  redirect("/admin/bookings?created=1");
}

const statusSchema = z.object({ id: z.uuid(), status: z.enum(["confirmed", "ongoing", "completed", "cancelled"]), depositReturned: z.string().optional() });

export async function updateBookingStatusAction(formData: FormData) {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateBookingStatus(parsed.data.id, parsed.data.status, parsed.data.depositReturned === "true" ? true : undefined);
  revalidatePath("/admin"); revalidatePath("/admin/bookings"); revalidatePath("/admin/customers");
}
