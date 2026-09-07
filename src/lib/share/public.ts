import "server-only";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { SHARE_TOKEN_PATTERN } from "./token";

export async function getSharedBooking(token: string) {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;
  const admin = getSupabaseAdmin();
  const { data: link, error } = await admin.from("booking_share_links")
    .select("id,booking_id,expires_at,booking:bookings(id,status,start_at,end_at,end_date,vehicle_id,vehicle:vehicles(id,registration_number,display_name,model))")
    .eq("token", token).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !link) return null;
  const booking = Array.isArray(link.booking) ? link.booking[0] : link.booking;
  if (!booking || booking.status === "cancelled" || !booking.vehicle_id) return null;
  const { data: documents, error: documentError } = await admin.from("vehicle_documents")
    .select("id,doc_type,file_name,file_mime,expires_on,file_path")
    .eq("vehicle_id", booking.vehicle_id).not("file_path", "is", null)
    .gte("expires_on", booking.end_date).order("expires_on", { ascending: false });
  if (documentError) return null;
  const latest = new Map<string, (typeof documents)[number]>();
  (documents || []).forEach((document) => { if (!latest.has(document.doc_type)) latest.set(document.doc_type, document); });
  after(() => admin.rpc("touch_booking_share_link", { p_token: token }));
  return { booking, documents: [...latest.values()] };
}
