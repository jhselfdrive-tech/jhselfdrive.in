"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addVehicleBlock,
  addVehicleDocument,
  assignVehicleToBooking,
  createVehicle,
  findAvailableVehicles,
  updateVehicle,
} from "@/lib/admin/fleet";
import { DOCUMENTS_BUCKET, removeObjects, uploadObject } from "@/lib/admin/storage";
import { DOCUMENT_LIMITS, objectKeyForDocument, validateUploads } from "@/lib/uploads/files";

export type FleetActionState = { message?: string; success?: boolean };

const optionalInteger = z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().nonnegative().optional());
const vehicleSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional().default(""),
  registrationNumber: z.string().trim().min(4).max(15).transform((value) => value.replace(/\s+/g, "").toUpperCase()),
  displayName: z.string().trim().max(80).optional().default(""),
  categorySlug: z.string().min(1).max(80),
  model: z.string().trim().max(80).optional().default(""),
  year: optionalInteger.refine((value) => value === undefined || (value >= 1980 && value <= 2100), "Enter a valid model year"),
  transmission: z.string().trim().max(40).optional().default(""),
  fuel: z.string().trim().max(40).optional().default(""),
  seats: optionalInteger.refine((value) => value === undefined || (value >= 1 && value <= 60), "Enter valid seating capacity"),
  status: z.enum(["active", "maintenance", "retired", "sold"]),
  odometerKm: optionalInteger,
  acquiredOn: z.union([z.literal(""), z.iso.date()]).optional().default(""),
  notes: z.string().trim().max(1500).optional().default(""),
});

export async function saveVehicleAction(_: FleetActionState, formData: FormData): Promise<FleetActionState> {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the vehicle details." };
  const { id, ...input } = parsed.data;
  try {
    if (id) {
      await updateVehicle(id, input);
      revalidatePath("/admin/fleet");
      revalidatePath(`/admin/fleet/${id}`);
      revalidatePath("/admin/calendar");
      return { success: true, message: "Vehicle details saved." };
    }
    const vehicleId = await createVehicle(input);
    revalidatePath("/admin/fleet");
    redirect(`/admin/fleet/${vehicleId}?created=1`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    console.error("Vehicle save failed", error);
    return { message: "Could not save this vehicle. Check that the registration number is unique." };
  }
  return {};
}

const documentSchema = z.object({
  vehicleId: z.uuid(),
  docType: z.enum(["insurance", "fitness", "permit", "puc", "road_tax"]),
  provider: z.string().trim().max(100).optional().default(""),
  referenceNumber: z.string().trim().max(100).optional().default(""),
  issuedOn: z.union([z.literal(""), z.iso.date()]).optional().default(""),
  expiresOn: z.iso.date(),
  notes: z.string().trim().max(500).optional().default(""),
}).refine((value) => !value.issuedOn || value.expiresOn >= value.issuedOn, { message: "Expiry must be on or after the issue date" });

export async function addDocumentAction(_: FleetActionState, formData: FormData): Promise<FleetActionState> {
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the document details." };
  const files = formData.getAll("file").filter((value): value is File => value instanceof File && value.size > 0);
  const checked = validateUploads(files.map((file) => ({ name: file.name, size: file.size, type: file.type })), DOCUMENT_LIMITS);
  if (!checked.ok) return { message: checked.errors[0] };
  const file = files[0];
  const documentId = randomUUID();
  const filePath = objectKeyForDocument(parsed.data.vehicleId, documentId, file.type);
  let uploaded = false;
  try {
    await uploadObject(DOCUMENTS_BUCKET, filePath, await file.arrayBuffer(), file.type);
    uploaded = true;
    await addVehicleDocument({
      ...parsed.data,
      id: documentId,
      issuedOn: parsed.data.issuedOn || undefined,
      filePath,
      fileName: file.name,
      fileMime: file.type,
      fileSizeBytes: file.size,
    });
  } catch (error) {
    if (uploaded) await removeObjects(DOCUMENTS_BUCKET, [filePath]).catch(() => undefined);
    console.error("Document save failed", error);
    return { message: "Could not save the document." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/fleet");
  revalidatePath(`/admin/fleet/${parsed.data.vehicleId}`);
  return { success: true, message: "Document and file added." };
}

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid start and end time");
const blockSchema = z.object({
  vehicleId: z.uuid(),
  startAt: localDateTime,
  endAt: localDateTime,
  reason: z.string().trim().min(3).max(300),
}).refine((value) => value.endAt > value.startAt, { message: "Block end must be after its start" });

function toIstTimestamp(value: string) {
  return `${value}:00+05:30`;
}

function codeOf(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

export async function addBlockAction(_: FleetActionState, formData: FormData): Promise<FleetActionState> {
  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message || "Check the block details." };
  try {
    await addVehicleBlock({
      vehicleId: parsed.data.vehicleId,
      startAt: toIstTimestamp(parsed.data.startAt),
      endAt: toIstTimestamp(parsed.data.endAt),
      reason: parsed.data.reason,
    });
  } catch (error) {
    console.error("Vehicle block save failed", error);
    const code = codeOf(error);
    if (code === "23P01") return { message: "That vehicle already has a block during those times." };
    if (code === "VEHICLE_BOOKED") return { message: "That vehicle already has a booking during those times." };
    return { message: "Could not add the availability block." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/fleet");
  revalidatePath(`/admin/fleet/${parsed.data.vehicleId}`);
  revalidatePath("/admin/calendar");
  return { success: true, message: "Availability block added." };
}

const availabilitySchema = z.object({
  categorySlug: z.string().min(1),
  startAt: localDateTime,
  endAt: localDateTime,
  excludeBookingId: z.union([z.literal(""), z.uuid()]).optional().default(""),
}).refine((value) => value.endAt > value.startAt, { message: "Return time must be after pickup time" });

export async function getAvailableVehiclesAction(input: z.input<typeof availabilitySchema>) {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { vehicles: [], message: parsed.error.issues[0]?.message || "Choose valid times." };
  try {
    const vehicles = await findAvailableVehicles(
      parsed.data.categorySlug,
      toIstTimestamp(parsed.data.startAt),
      toIstTimestamp(parsed.data.endAt),
      parsed.data.excludeBookingId || undefined,
    );
    return { vehicles, message: vehicles.length ? "" : "No free vehicle in this category for those times." };
  } catch (error) {
    console.error("Availability lookup failed", error);
    return { vehicles: [], message: "Availability could not be checked." };
  }
}

const assignmentSchema = z.object({
  bookingId: z.uuid(),
  vehicleId: z.union([z.literal(""), z.uuid()]),
});

export async function assignVehicleAction(_: FleetActionState, formData: FormData): Promise<FleetActionState> {
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose a valid vehicle." };
  try {
    await assignVehicleToBooking(parsed.data.bookingId, parsed.data.vehicleId || undefined);
  } catch (error) {
    console.error("Vehicle assignment failed", error);
    const code = codeOf(error);
    if (code === "23P01") return { message: "That car is already booked for those dates." };
    if (code === "VEHICLE_UNAVAILABLE") return { message: "That car is unavailable or blocked for those times." };
    return { message: "Could not assign this vehicle." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
  return { success: true, message: "Vehicle assignment saved." };
}
