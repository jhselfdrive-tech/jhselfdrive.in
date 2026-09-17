"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bookingMessageContext, markMessageSent, markMessageSkipped, queueMessage } from "@/lib/admin/messages";

export type MessageActionState = { message?: string; success?: boolean };

function revalidateBooking(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  if (id) revalidatePath(`/admin/bookings/${id}`);
}

const sentSchema = z.object({ id: z.uuid() });

export async function markMessageSentAction(_: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const parsed = sentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Could not record that message." };
  try {
    revalidateBooking(await markMessageSent(parsed.data.id));
  } catch (error) {
    console.error("Marking message sent failed", error);
    return { message: "Could not record that message as sent." };
  }
  return { success: true, message: "Message recorded as sent." };
}

const skipSchema = z.object({ id: z.uuid(), reason: z.string().trim().max(300).optional().default("") });

export async function markMessageSkippedAction(_: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const parsed = skipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Could not skip that message." };
  try {
    revalidateBooking(await markMessageSkipped(parsed.data.id, parsed.data.reason));
  } catch (error) {
    console.error("Skipping message failed", error);
    return { message: "Could not skip that message." };
  }
  return { success: true, message: "Message skipped." };
}

const reminderSchema = z.object({
  bookingId: z.uuid(),
  reminder: z.enum(["pickup", "return_due", "overdue"]),
  onDate: z.iso.date(),
  outcome: z.enum(["sent", "skipped"]),
});

/**
 * Reminders are derived from booking dates and have no row until acted on, so
 * sending or dismissing one both creates it and resolves it in a single step.
 */
export async function resolveReminderAction(_: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const parsed = reminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Could not record that reminder." };
  const { bookingId, reminder, onDate, outcome } = parsed.data;
  try {
    const resolved = await bookingMessageContext(bookingId);
    if (!resolved) return { message: "That booking has no phone number to message." };
    const queued = await queueMessage(bookingId, { kind: "reminder", reminder, onDate }, resolved.context, resolved.phone);
    if (!queued) return { message: "That reminder was already handled." };
    if (outcome === "sent") await markMessageSent(queued.id);
    else await markMessageSkipped(queued.id, "Dismissed from the dashboard");
  } catch (error) {
    console.error("Reminder resolution failed", error);
    return { message: "Could not record that reminder." };
  }
  revalidateBooking(bookingId);
  return { success: true, message: outcome === "sent" ? "Reminder recorded as sent." : "Reminder dismissed." };
}
