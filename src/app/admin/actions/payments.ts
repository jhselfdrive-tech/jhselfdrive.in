"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deletePayment, recordPayment } from "@/lib/admin/payments";
import { PAYMENT_METHOD_LABEL } from "@/lib/bookings/payments";
import { queueMessageForBooking, type QueuedMessage } from "@/lib/admin/messages";

export type PaymentActionState = {
  message?: string;
  success?: boolean;
  /** Queued customer message to prompt for, if any. */
  queued?: QueuedMessage;
};

function revalidateBooking(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/customers");
}

const paymentSchema = z.object({
  bookingId: z.uuid(),
  kind: z.enum(["rental", "deposit", "refund"]),
  amount: z.coerce.number().positive("Enter an amount greater than zero").max(10_000_000),
  method: z.enum(["cash", "upi", "bank", "other"]),
  note: z.string().trim().max(300).optional().default(""),
});

export async function recordPaymentAction(_: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the payment details." };
  const { bookingId, kind, amount, method, note } = parsed.data;
  let queued: QueuedMessage | null = null;
  try {
    const paymentId = await recordPayment({ bookingId, kind, amount, method, note });
    // Queued after the ledger write so the running balance in the message
    // already accounts for this payment.
    queued = await queueMessageForBooking(bookingId, { kind: "payment", paymentId, paymentKind: kind }, {
      amountPaid: amount,
      paymentMethod: PAYMENT_METHOD_LABEL[method],
    });
  } catch (error) {
    console.error("Recording payment failed", error);
    return { message: "Could not record that payment." };
  }
  revalidateBooking(bookingId);
  return { success: true, message: "Payment recorded.", queued: queued || undefined };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deletePaymentAction(_: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Could not remove that payment." };
  try {
    const bookingId = await deletePayment(parsed.data.id);
    if (bookingId) revalidateBooking(bookingId);
  } catch (error) {
    console.error("Deleting payment failed", error);
    if (typeof error === "object" && error && "code" in error && String(error.code) === "PAYMENT_FROM_HANDOVER") {
      return { message: "This entry came from a handover checklist — edit the amount there instead." };
    }
    return { message: "Could not remove that payment." };
  }
  return { success: true, message: "Payment removed." };
}
