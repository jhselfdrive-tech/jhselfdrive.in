"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addBookingMedia,
  deleteBookingMedia,
  getBookingMediaContext,
  purgeExpiredMedia,
  revealLicenceMedia,
  revokeBookingShareLink,
  rotateBookingShareLink,
  saveHandover,
} from "@/lib/admin/bookings";
import { DOCUMENTS_BUCKET, IDENTITY_BUCKET, removeObjects, uploadObject } from "@/lib/admin/storage";
import { MEDIA_LIMITS, objectKeyForMedia, validateUploads } from "@/lib/uploads/files";

export type HandoverActionState = { message?: string; success?: boolean; shareUrl?: string };

const optionalNumber = z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().nonnegative().optional());
const handoverSchema = z.object({
  bookingId: z.uuid(),
  phase: z.enum(["delivery", "return"]),
  odometerKm: optionalNumber.pipe(z.number().int().optional()),
  fuelEighths: optionalNumber.pipe(z.number().int().min(0).max(8).optional()),
  paymentReceived: z.string().optional(),
  paymentAmount: z.coerce.number().min(0).default(0),
  depositAmount: z.coerce.number().min(0).default(0),
  damageNotes: z.string().trim().max(1500).optional().default(""),
  notes: z.string().trim().max(1500).optional().default(""),
});

function revalidateBooking(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/fleet");
}

export async function saveHandoverAction(_: HandoverActionState, formData: FormData): Promise<HandoverActionState> {
  const parsed = handoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the handover details." };
  try {
    await saveHandover({ ...parsed.data, paymentReceived: parsed.data.paymentReceived === "on" });
  } catch (error) {
    console.error("Handover save failed", error);
    return { message: "Could not save the handover checklist." };
  }
  revalidateBooking(parsed.data.bookingId);
  return { success: true, message: `${parsed.data.phase === "delivery" ? "Delivery" : "Return"} checklist saved.` };
}

const mediaSchema = z.object({ bookingId: z.uuid(), phase: z.enum(["delivery", "return"]), mediaType: z.enum(["licence_front", "licence_back", "vehicle_condition"]) });

export async function uploadBookingMediaAction(_: HandoverActionState, formData: FormData): Promise<HandoverActionState> {
  const parsed = mediaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the media details." };
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  const limits = { ...MEDIA_LIMITS, maxFiles: parsed.data.mediaType === "vehicle_condition" ? 6 : 1 };
  const checked = validateUploads(files.map((file) => ({ name: file.name, size: file.size, type: file.type })), limits);
  if (!checked.ok) return { message: checked.errors[0] };
  const context = await getBookingMediaContext(parsed.data.bookingId);
  const purgeAfter = new Date(new Date(context.end_at).getTime() + 90 * 86_400_000).toISOString().slice(0, 10);
  const bucket = parsed.data.mediaType === "vehicle_condition" ? DOCUMENTS_BUCKET : IDENTITY_BUCKET;
  for (const file of files) {
    const id = randomUUID();
    const path = objectKeyForMedia(parsed.data.bookingId, parsed.data.phase, parsed.data.mediaType, id, file.type);
    let uploaded = false;
    try {
      await uploadObject(bucket, path, await file.arrayBuffer(), file.type);
      uploaded = true;
      await addBookingMedia({ id, booking_id: parsed.data.bookingId, phase: parsed.data.phase, media_type: parsed.data.mediaType, bucket_id: bucket, file_path: path, file_name: file.name, file_mime: file.type, file_size_bytes: file.size, purge_after: purgeAfter });
    } catch (error) {
      if (uploaded) await removeObjects(bucket, [path]).catch(() => undefined);
      console.error("Booking media upload failed", error);
      return { message: parsed.data.mediaType.startsWith("licence") ? "That licence slot may already have a file. Delete it before replacing." : "Could not upload all selected photos." };
    }
  }
  revalidateBooking(parsed.data.bookingId);
  return { success: true, message: `${files.length} file${files.length === 1 ? "" : "s"} uploaded.` };
}

export async function deleteBookingMediaAction(formData: FormData) {
  const parsed = z.object({ id: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const bookingId = await deleteBookingMedia(parsed.data.id);
  if (bookingId) revalidateBooking(bookingId);
}

export async function revealLicenceMediaAction(input: { mediaId: string }) {
  const parsed = z.object({ mediaId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { url: null, message: "Invalid file." };
  try {
    return { url: await revealLicenceMedia(parsed.data.mediaId), message: "" };
  } catch (error) {
    console.error("Licence reveal failed", error);
    return { url: null, message: "Could not open this restricted file." };
  }
}

export async function rotateShareLinkAction(_: HandoverActionState, formData: FormData): Promise<HandoverActionState> {
  const parsed = z.object({ bookingId: z.uuid(), expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]).optional().default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Invalid booking." };
  try {
    const link = await rotateBookingShareLink(parsed.data.bookingId, parsed.data.expiresAt || undefined);
    revalidateBooking(parsed.data.bookingId);
    return { success: true, message: "Fresh customer link created.", shareUrl: `/r/${link.token}` };
  } catch (error) {
    console.error("Share link rotation failed", error);
    return { message: "Could not create the customer link." };
  }
}

export async function revokeShareLinkAction(formData: FormData) {
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await revokeBookingShareLink(parsed.data.bookingId);
  revalidateBooking(parsed.data.bookingId);
}

export async function purgeExpiredMediaAction(formData: FormData) {
  const parsed = z.object({ confirm: z.literal("purge") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await purgeExpiredMedia();
  revalidatePath("/admin");
}
