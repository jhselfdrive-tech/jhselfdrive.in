import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { rangesOverlap, utilisationPercentage } from "./availability";
import { checklistGaps, type ChecklistFacts } from "./checklist";
import { isMissingSchema } from "./schema";
import { DOCUMENTS_BUCKET, removeObjects, signObjects } from "./storage";
import { PHOTOS_BUCKET, publicPhotoUrl } from "@/lib/fleet/photos";

export type VehicleStatus = "active" | "maintenance" | "retired" | "sold";
export type DocumentType = "insurance" | "fitness" | "permit" | "puc" | "road_tax";

export type Vehicle = {
  id: string;
  registration_number: string;
  display_name: string | null;
  category_slug: string;
  model: string | null;
  year: number | null;
  transmission: string | null;
  fuel: string | null;
  seats: number | null;
  status: VehicleStatus;
  odometer_km: number | null;
  acquired_on: string | null;
  notes: string | null;
  day_rate: number;
  km_rate: number | null;
  included_km_per_day: number | null;
  deposit: number;
  tagline: string | null;
  description: string | null;
  is_bookable: boolean;
  created_at: string;
};

export type VehiclePhoto = {
  id: string;
  vehicle_id: string;
  file_path: string;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
  url: string | null;
};

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  doc_type: DocumentType;
  provider: string | null;
  reference_number: string | null;
  issued_on: string | null;
  expires_on: string;
  notes: string | null;
  created_at: string;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  signedUrl?: string | null;
};

export type VehicleBlock = {
  id: string;
  vehicle_id: string;
  start_at: string;
  end_at: string;
  reason: string;
  created_by: string;
  created_at: string;
};

export type AvailableVehicle = Pick<Vehicle, "id" | "registration_number" | "display_name" | "category_slug" | "model" | "seats">;

export type VehicleAlert = {
  id: string;
  vehicle_id: string;
  registration_number: string;
  vehicle_name: string;
  doc_type: DocumentType;
  provider: string | null;
  reference_number: string | null;
  expires_on: string;
  days_remaining: number;
};

type VehicleInput = {
  registrationNumber: string;
  displayName: string;
  categorySlug: string;
  model: string;
  year?: number;
  transmission: string;
  fuel: string;
  seats?: number;
  status: VehicleStatus;
  odometerKm?: number;
  acquiredOn?: string;
  notes: string;
  dayRate: number;
  kmRate?: number;
  includedKmPerDay?: number;
  deposit: number;
  tagline: string;
  description: string;
  isBookable: boolean;
};

function cleanVehicle(input: VehicleInput) {
  return {
    registration_number: input.registrationNumber.replace(/\s+/g, "").toUpperCase(),
    display_name: input.displayName.trim() || null,
    category_slug: input.categorySlug,
    model: input.model.trim() || null,
    year: input.year || null,
    transmission: input.transmission.trim() || null,
    fuel: input.fuel.trim() || null,
    seats: input.seats || null,
    status: input.status,
    odometer_km: input.odometerKm ?? null,
    acquired_on: input.acquiredOn || null,
    notes: input.notes.trim() || null,
    day_rate: input.dayRate,
    km_rate: input.kmRate ?? null,
    included_km_per_day: input.includedKmPerDay ?? null,
    deposit: input.deposit,
    tagline: input.tagline.trim() || null,
    description: input.description.trim() || null,
    is_bookable: input.isBookable,
  };
}

function fleetError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

export async function listVehicles(filters: { status?: string; category?: string } = {}) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  let query = admin.from("vehicles").select("*").order("registration_number");
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.category && filters.category !== "all") query = query.eq("category_slug", filters.category);
  const now = new Date().toISOString();
  const [vehiclesResult, alertsResult, bookingsResult, photosResult] = await Promise.all([
    query,
    admin.from("vehicle_alerts").select("*"),
    admin.from("bookings").select("id,vehicle_id,start_at,end_at,status,customer:customers(full_name,phone)").lte("start_at", now).gt("end_at", now).in("status", ["confirmed", "ongoing"]),
    admin.from("vehicle_photos").select("vehicle_id,file_path,sort_order").order("sort_order"),
  ]);
  if (vehiclesResult.error) throw vehiclesResult.error;
  if (alertsResult.error) throw alertsResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  // vehicle_photos arrives with migration 0006; until then the grid simply
  // shows no thumbnails rather than failing the whole page.
  if (photosResult.error && !isMissingSchema(photosResult.error)) throw photosResult.error;
  const alerts = (alertsResult.data || []) as VehicleAlert[];
  const photos = (photosResult.data || []) as Array<{ vehicle_id: string; file_path: string }>;
  const vehicles = ((vehiclesResult.data || []) as Vehicle[]).map((vehicle) => ({
    ...vehicle,
    documentAlerts: alerts.filter((alert) => alert.vehicle_id === vehicle.id),
    photoUrl: publicPhotoUrl(photos.find((photo) => photo.vehicle_id === vehicle.id)?.file_path),
    photoCount: photos.filter((photo) => photo.vehicle_id === vehicle.id).length,
    currentBooking: (bookingsResult.data || []).find((booking) => booking.vehicle_id === vehicle.id) || null,
  }));
  return { vehicles, schemaReady: !photosResult.error };
}

export async function getVehicle(id: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const [vehicleResult, documentsResult, blocksResult, bookingsResult, photosResult] = await Promise.all([
    admin.from("vehicles").select("*").eq("id", id).maybeSingle(),
    admin.from("vehicle_documents").select("*").eq("vehicle_id", id).order("expires_on", { ascending: false }),
    admin.from("vehicle_blocks").select("*").eq("vehicle_id", id).order("start_at", { ascending: false }),
    admin.from("bookings").select("id,customer_id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,status,created_at,customer:customers(full_name,phone)").eq("vehicle_id", id).order("start_at", { ascending: false }),
    admin.from("vehicle_photos").select("*").eq("vehicle_id", id).order("sort_order").order("created_at"),
  ]);
  if (vehicleResult.error) throw vehicleResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (blocksResult.error) throw blocksResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (photosResult.error && !isMissingSchema(photosResult.error)) throw photosResult.error;
  if (!vehicleResult.data) return null;
  const bookings = bookingsResult.data || [];
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 90 * 86_400_000);
  const counted = bookings.filter((booking) => booking.status !== "cancelled").map((booking) => ({ startAt: booking.start_at, endAt: booking.end_at }));
  const revenue = bookings.filter((booking) => booking.status === "completed").reduce((sum, booking) => sum + Number(booking.amount_total || 0), 0);
  const documents = (documentsResult.data || []) as VehicleDocument[];
  const signedDocuments = await signObjects(DOCUMENTS_BUCKET, documents.flatMap((document) => document.file_path ? [document.file_path] : []));
  return {
    vehicle: vehicleResult.data as Vehicle,
    documents: documents.map((document) => ({ ...document, signedUrl: document.file_path ? signedDocuments.get(document.file_path) || null : null })),
    blocks: (blocksResult.data || []) as VehicleBlock[],
    photos: ((photosResult.data || []) as VehiclePhoto[]).map((photo) => ({ ...photo, url: publicPhotoUrl(photo.file_path) })),
    schemaReady: !photosResult.error,
    bookings,
    utilisation: utilisationPercentage(counted, periodStart, periodEnd),
    revenue,
  };
}

export async function createVehicle(input: VehicleInput) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("vehicles").insert(cleanVehicle(input)).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateVehicle(id: string, input: VehicleInput) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("vehicles").update(cleanVehicle(input)).eq("id", id);
  if (error) throw error;
}

export async function addVehicleDocument(input: {
  id?: string;
  vehicleId: string; docType: DocumentType; provider: string; referenceNumber: string;
  issuedOn?: string; expiresOn: string; notes: string;
  filePath?: string; fileName?: string; fileMime?: string; fileSizeBytes?: number;
}) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("vehicle_documents").insert({
    id: input.id,
    vehicle_id: input.vehicleId,
    doc_type: input.docType,
    provider: input.provider.trim() || null,
    reference_number: input.referenceNumber.trim() || null,
    issued_on: input.issuedOn || null,
    expires_on: input.expiresOn,
    notes: input.notes.trim() || null,
    file_path: input.filePath || null,
    file_name: input.fileName || null,
    file_mime: input.fileMime || null,
    file_size_bytes: input.fileSizeBytes || null,
  });
  if (error) throw error;
}

export async function addVehicleBlock(input: { vehicleId: string; startAt: string; endAt: string; reason: string }) {
  const adminUser = await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data: conflicts, error: conflictError } = await admin.from("bookings").select("id").eq("vehicle_id", input.vehicleId).in("status", ["confirmed", "ongoing", "completed"]).lt("start_at", input.endAt).gt("end_at", input.startAt).limit(1);
  if (conflictError) throw conflictError;
  if (conflicts?.length) throw fleetError("This block overlaps an existing booking.", "VEHICLE_BOOKED");
  const { error } = await admin.from("vehicle_blocks").insert({
    vehicle_id: input.vehicleId, start_at: input.startAt, end_at: input.endAt,
    reason: input.reason.trim(), created_by: adminUser.email,
  });
  if (error) throw error;
}

export async function findAvailableVehicles(categorySlug: string, startAt: string, endAt: string, excludeBookingId?: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().rpc("find_available_vehicles", {
    p_category_slug: categorySlug,
    p_start_at: startAt,
    p_end_at: endAt,
    p_exclude_booking_id: excludeBookingId || null,
  });
  if (error) throw error;
  return (data || []) as AvailableVehicle[];
}

export async function assignVehicleToBooking(bookingId: string, vehicleId?: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await admin.from("bookings").select("id,car_slug,start_at,end_at,status").eq("id", bookingId).maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw fleetError("Booking was not found.", "BOOKING_NOT_FOUND");
  if (vehicleId && booking.status !== "cancelled") {
    const { data: available, error: availabilityError } = await admin.rpc("find_available_vehicles", {
      p_category_slug: booking.car_slug,
      p_start_at: booking.start_at,
      p_end_at: booking.end_at,
      p_exclude_booking_id: booking.id,
    });
    if (availabilityError) throw availabilityError;
    if (!(available || []).some((vehicle: { id: string }) => vehicle.id === vehicleId)) {
      throw fleetError("That vehicle is not available for this booking.", "VEHICLE_UNAVAILABLE");
    }
  }
  const { error } = await admin.from("bookings").update({ vehicle_id: vehicleId || null }).eq("id", bookingId);
  if (error) throw error;
}

export async function getCalendarData(startAt: string, endAt: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const [vehiclesResult, bookingsResult, blocksResult] = await Promise.all([
    admin.from("vehicles").select("id,registration_number,display_name,category_slug,status").not("status", "in", "(retired,sold)").order("registration_number"),
    admin.from("bookings").select("id,vehicle_id,start_at,end_at,status,car_slug,customer:customers(full_name,phone)").not("vehicle_id", "is", null).neq("status", "cancelled").lt("start_at", endAt).gt("end_at", startAt).order("start_at"),
    admin.from("vehicle_blocks").select("id,vehicle_id,start_at,end_at,reason").lt("start_at", endAt).gt("end_at", startAt).order("start_at"),
  ]);
  if (vehiclesResult.error) throw vehiclesResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (blocksResult.error) throw blocksResult.error;
  return { vehicles: vehiclesResult.data || [], bookings: bookingsResult.data || [], blocks: blocksResult.data || [] };
}

export async function getFleetAlerts() {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const now = new Date();
  const stale = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const [documents, overdue, unassigned, staleRequests, assignedBookings, blocks] = await Promise.all([
    admin.from("vehicle_alerts").select("*").order("days_remaining"),
    admin.from("bookings").select("id,end_at,vehicle:vehicles(registration_number,display_name),customer:customers(full_name,phone)").eq("status", "ongoing").lt("end_at", now.toISOString()).order("end_at"),
    admin.from("bookings").select("id,start_at,car_slug,customer:customers(full_name,phone)").eq("status", "approved").is("vehicle_id", null).order("start_at"),
    admin.from("bookings").select("id,created_at,car_slug,start_at,customer:customers(full_name,phone)").eq("status", "requested").lt("created_at", stale).order("created_at"),
    admin.from("bookings").select("id,vehicle_id,start_at,end_at,vehicle:vehicles(registration_number)").not("vehicle_id", "is", null).in("status", ["confirmed", "ongoing"]),
    admin.from("vehicle_blocks").select("id,vehicle_id,start_at,end_at,reason"),
  ]);
  if (documents.error) throw documents.error;
  if (overdue.error) throw overdue.error;
  if (unassigned.error) throw unassigned.error;
  if (staleRequests.error) throw staleRequests.error;
  if (assignedBookings.error) throw assignedBookings.error;
  if (blocks.error) throw blocks.error;
  const activeBookingIds = (assignedBookings.data || []).map((booking) => booking.id);
  const [checklists, purges] = await Promise.all([
    activeBookingIds.length ? admin.from("booking_checklist_status").select("*").in("booking_id", activeBookingIds) : Promise.resolve({ data: [], error: null }),
    admin.from("booking_media").select("id,booking_id,purge_after").lt("purge_after", now.toISOString().slice(0, 10)).order("purge_after"),
  ]);
  if (checklists.error && !isMissingSchema(checklists.error)) throw checklists.error;
  if (purges.error && !isMissingSchema(purges.error)) throw purges.error;
  const conflicts = (assignedBookings.data || []).flatMap((booking) => {
    const conflict = (blocks.data || []).find((block) => block.vehicle_id === booking.vehicle_id && rangesOverlap(booking.start_at, booking.end_at, block.start_at, block.end_at));
    if (!conflict) return [];
    const vehicle = Array.isArray(booking.vehicle) ? booking.vehicle[0] : booking.vehicle;
    return [{ bookingId: booking.id, vehicleId: booking.vehicle_id as string, registrationNumber: vehicle?.registration_number || "Vehicle", reason: conflict.reason }];
  });
  const checklist = (checklists.data || []).flatMap((row) => {
    const gaps = checklistGaps(row as ChecklistFacts);
    if (!gaps.length) return [];
    const booking = (assignedBookings.data || []).find((item) => item.id === row.booking_id);
    const vehicle = booking ? (Array.isArray(booking.vehicle) ? booking.vehicle[0] : booking.vehicle) : null;
    return [{ bookingId: String(row.booking_id), label: vehicle?.registration_number || "Active booking", gaps }];
  });
  return {
    documents: (documents.data || []) as VehicleAlert[],
    overdue: overdue.data || [],
    unassigned: unassigned.data || [],
    staleRequests: staleRequests.data || [],
    conflicts,
    checklist,
    overduePurges: purges.data || [],
  };
}

export async function addVehiclePhotos(vehicleId: string, photos: Array<{ id: string; filePath: string; fileName: string; fileMime: string; fileSizeBytes: number }>) {
  await verifyAdmin();
  if (!photos.length) return;
  const admin = getSupabaseAdmin();
  const { data: existing, error: existingError } = await admin.from("vehicle_photos").select("sort_order").eq("vehicle_id", vehicleId).order("sort_order", { ascending: false }).limit(1);
  if (existingError) throw existingError;
  const start = (existing?.[0]?.sort_order ?? -1) + 1;
  const { error } = await admin.from("vehicle_photos").insert(photos.map((photo, index) => ({
    id: photo.id,
    vehicle_id: vehicleId,
    file_path: photo.filePath,
    file_name: photo.fileName,
    file_mime: photo.fileMime,
    file_size_bytes: photo.fileSizeBytes,
    sort_order: start + index,
  })));
  if (error) throw error;
}

/** Applies an explicit photo order. Ids not belonging to the vehicle are ignored. */
export async function reorderVehiclePhotos(vehicleId: string, orderedIds: string[]) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("vehicle_photos").select("id").eq("vehicle_id", vehicleId);
  if (error) throw error;
  const owned = new Set((data || []).map((photo) => photo.id as string));
  const ordered = orderedIds.filter((id) => owned.has(id));
  for (const [index, id] of ordered.entries()) {
    const { error: updateError } = await admin.from("vehicle_photos").update({ sort_order: index }).eq("id", id).eq("vehicle_id", vehicleId);
    if (updateError) throw updateError;
  }
}

export async function deleteVehiclePhoto(photoId: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("vehicle_photos").select("id,vehicle_id,file_path").eq("id", photoId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { error: deleteError } = await admin.from("vehicle_photos").delete().eq("id", photoId);
  if (deleteError) throw deleteError;
  // Storage is cleaned up after the row is gone: an orphaned object is
  // recoverable, a row pointing at a missing object renders a broken card.
  await removeObjects(PHOTOS_BUCKET, [data.file_path as string]).catch(() => undefined);
  return data.vehicle_id as string;
}

/**
 * Hard-deletes a vehicle and its photos. bookings.vehicle_id is ON DELETE
 * RESTRICT, so a car with any booking history cannot be removed without
 * orphaning that history — those must be retired instead.
 */
export async function deleteVehicle(vehicleId: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { count, error: countError } = await admin.from("bookings").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId);
  if (countError) throw countError;
  if (count && count > 0) throw fleetError("This vehicle has booking history.", "VEHICLE_HAS_BOOKINGS");

  const [photos, documents] = await Promise.all([
    admin.from("vehicle_photos").select("file_path").eq("vehicle_id", vehicleId),
    admin.from("vehicle_documents").select("file_path").eq("vehicle_id", vehicleId),
  ]);
  if (photos.error) throw photos.error;
  if (documents.error) throw documents.error;

  const { error } = await admin.from("vehicles").delete().eq("id", vehicleId);
  if (error) throw error;

  const photoPaths = (photos.data || []).map((photo) => photo.file_path as string).filter(Boolean);
  const documentPaths = (documents.data || []).flatMap((document) => document.file_path ? [document.file_path as string] : []);
  await Promise.all([
    photoPaths.length ? removeObjects(PHOTOS_BUCKET, photoPaths).catch(() => undefined) : undefined,
    documentPaths.length ? removeObjects(DOCUMENTS_BUCKET, documentPaths).catch(() => undefined) : undefined,
  ]);
}
