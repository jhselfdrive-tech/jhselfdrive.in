import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { generateShareToken, clampShareExpiry, defaultShareExpiry } from "@/lib/share/token";
import { verifyAdmin } from "./auth";
import { isMissingSchema } from "./schema";
import { DOCUMENTS_BUCKET, IDENTITY_BUCKET, removeObjects, signObject, signObjects } from "./storage";

export type HandoverPhase = "delivery" | "return";
export type BookingMediaType = "licence_front" | "licence_back" | "vehicle_condition";

export type BookingHandover = {
  id: string; booking_id: string; phase: HandoverPhase; recorded_by: string; recorded_at: string;
  odometer_km: number | null; fuel_eighths: number | null; payment_received: boolean;
  payment_amount: number; deposit_amount: number; damage_notes: string | null; notes: string | null;
};

export type BookingMedia = {
  id: string; booking_id: string; phase: HandoverPhase; media_type: BookingMediaType;
  bucket_id: typeof DOCUMENTS_BUCKET | typeof IDENTITY_BUCKET; file_path: string; file_name: string;
  file_mime: string; file_size_bytes: number; purge_after: string; uploaded_by: string; created_at: string;
  signedUrl?: string | null;
};

export async function getBookingDetail(id: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const [booking, handovers, media, links, checklist] = await Promise.all([
    admin.from("bookings").select("id,customer_id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,customer:customers(id,full_name,phone,email,city),vehicle:vehicles(id,registration_number,display_name,model,category_slug,odometer_km)").eq("id", id).maybeSingle(),
    admin.from("booking_handovers").select("*").eq("booking_id", id).order("recorded_at"),
    admin.from("booking_media").select("*").eq("booking_id", id).order("created_at"),
    admin.from("booking_share_links").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
    admin.from("booking_checklist_status").select("*").eq("booking_id", id).maybeSingle(),
  ]);
  if (booking.error) throw booking.error;
  const phaseFourErrors = [handovers.error, media.error, links.error, checklist.error].filter(Boolean);
  const schemaReady = phaseFourErrors.length === 0;
  const unexpectedError = phaseFourErrors.find((error) => !isMissingSchema(error));
  if (unexpectedError) throw unexpectedError;
  if (!booking.data) return null;
  const mediaRows = (media.data || []) as BookingMedia[];
  const conditionRows = mediaRows.filter((item) => item.bucket_id === DOCUMENTS_BUCKET);
  const urls = await signObjects(DOCUMENTS_BUCKET, conditionRows.map((item) => item.file_path), 600);
  return {
    booking: booking.data,
    handovers: schemaReady ? (handovers.data || []) as BookingHandover[] : [],
    media: schemaReady ? mediaRows.map((item) => ({ ...item, signedUrl: item.bucket_id === DOCUMENTS_BUCKET ? urls.get(item.file_path) || null : null })) : [],
    shareLinks: schemaReady ? links.data || [] : [],
    checklist: schemaReady ? checklist.data : null,
    schemaReady,
  };
}

export async function saveHandover(input: {
  bookingId: string; phase: HandoverPhase; odometerKm?: number; fuelEighths?: number;
  paymentReceived: boolean; paymentAmount: number; depositAmount: number; damageNotes: string; notes: string;
}) {
  const adminUser = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().rpc("save_booking_handover", {
    p_booking_id: input.bookingId, p_phase: input.phase, p_odometer_km: input.odometerKm ?? null,
    p_fuel_eighths: input.fuelEighths ?? null, p_payment_received: input.paymentReceived,
    p_payment_amount: input.paymentAmount, p_deposit_amount: input.depositAmount,
    p_damage_notes: input.damageNotes, p_notes: input.notes, p_recorded_by: adminUser.email,
  });
  if (error) throw error;
  return data as string;
}

export async function addBookingMedia(input: Omit<BookingMedia, "created_at" | "uploaded_by" | "signedUrl">) {
  const adminUser = await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("booking_media").insert({ ...input, uploaded_by: adminUser.email });
  if (error) throw error;
}

export async function getBookingMediaContext(id: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("bookings").select("id,end_at").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Booking not found");
  return data;
}

export async function deleteBookingMedia(id: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("booking_media").select("id,bucket_id,file_path,booking_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await removeObjects(data.bucket_id, [data.file_path]);
  const removed = await admin.from("booking_media").delete().eq("id", id);
  if (removed.error) throw removed.error;
  return data.booking_id as string;
}

export async function rotateBookingShareLink(bookingId: string, requestedExpiry?: string) {
  const adminUser = await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await admin.from("bookings").select("end_at").eq("id", bookingId).maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw new Error("Booking not found");
  const requested = requestedExpiry && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(requestedExpiry) ? `${requestedExpiry}:00+05:30` : requestedExpiry;
  const expiresAt = clampShareExpiry(requested || defaultShareExpiry(booking.end_at), booking.end_at);
  const token = generateShareToken();
  const { error } = await admin.rpc("rotate_booking_share_link", { p_booking_id: bookingId, p_token: token, p_expires_at: expiresAt.toISOString(), p_created_by: adminUser.email });
  if (error) throw error;
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function revokeBookingShareLink(bookingId: string) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("booking_share_links").update({ revoked_at: new Date().toISOString() }).eq("booking_id", bookingId).is("revoked_at", null);
  if (error) throw error;
}

export async function revealLicenceMedia(id: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("booking_media").select("id,bucket_id,file_path").eq("id", id).in("media_type", ["licence_front", "licence_back"]).eq("bucket_id", IDENTITY_BUCKET).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Licence media not found");
  return signObject(IDENTITY_BUCKET, data.file_path, 60);
}

export async function purgeExpiredMedia() {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.from("booking_media").select("id,bucket_id,file_path").lt("purge_after", today);
  if (error) throw error;
  for (const bucket of [DOCUMENTS_BUCKET, IDENTITY_BUCKET] as const) {
    const rows = (data || []).filter((item) => item.bucket_id === bucket);
    await removeObjects(bucket, rows.map((item) => item.file_path));
  }
  if (data?.length) {
    const removed = await admin.from("booking_media").delete().in("id", data.map((item) => item.id));
    if (removed.error) throw removed.error;
  }
  return data?.length || 0;
}
