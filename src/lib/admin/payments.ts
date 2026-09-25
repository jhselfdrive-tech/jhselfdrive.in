import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { isMissingSchema } from "./schema";
import type { PaymentKind } from "@/lib/messages/events";
import type { BookingPayment, PaymentMethod } from "@/lib/bookings/payments";

export type { BookingPayment, PaymentMethod };
export { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/bookings/payments";

export async function listPayments(bookingId: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("received_at");
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data || []).map((row) => ({ ...row, amount: Number(row.amount) })) as BookingPayment[];
}

export async function recordPayment(input: {
  bookingId: string;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  note?: string;
}) {
  const adminUser = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_payments")
    .insert({
      booking_id: input.bookingId,
      kind: input.kind,
      amount: input.amount,
      method: input.method,
      note: input.note?.trim() || null,
      recorded_by: adminUser.email,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Entries created by a handover checklist are edited there, not deleted here. */
export async function deletePayment(paymentId: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("booking_payments").select("booking_id,handover_id").eq("id", paymentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.handover_id) {
    throw Object.assign(new Error("Payment belongs to a handover checklist"), { code: "PAYMENT_FROM_HANDOVER" });
  }
  const { error: deleteError } = await admin.from("booking_payments").delete().eq("id", paymentId);
  if (deleteError) throw deleteError;
  return data.booking_id as string;
}

export async function updatePayment(id: string, patch: import('zod').output<typeof import('@/lib/ops/schemas').paymentPatchSchema>) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const {data:existing,error:readError} = await admin.from('booking_payments').select('id,handover_id').eq('id',id).maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error('PAYMENT_NOT_FOUND');
  if (existing.handover_id) throw new Error('PAYMENT_FROM_HANDOVER');
  const {data,error} = await admin.from('booking_payments').update(patch).eq('id',id).is('handover_id',null).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('PAYMENT_NOT_FOUND');
}
