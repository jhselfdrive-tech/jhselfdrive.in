import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { rangesOverlap, utilisationPercentage } from "./availability";

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
  created_at: string;
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
  const [vehiclesResult, alertsResult, bookingsResult] = await Promise.all([
    query,
    admin.from("vehicle_alerts").select("*"),
    admin.from("bookings").select("id,vehicle_id,start_at,end_at,status,customer:customers(full_name,phone)").lte("start_at", now).gt("end_at", now).in("status", ["confirmed", "ongoing"]),
  ]);
  if (vehiclesResult.error) throw vehiclesResult.error;
  if (alertsResult.error) throw alertsResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  const alerts = (alertsResult.data || []) as VehicleAlert[];
  return ((vehiclesResult.data || []) as Vehicle[]).map((vehicle) => ({
    ...vehicle,
    documentAlerts: alerts.filter((alert) => alert.vehicle_id === vehicle.id),
    currentBooking: (bookingsResult.data || []).find((booking) => booking.vehicle_id === vehicle.id) || null,
  }));
}

export async function getVehicle(id: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const [vehicleResult, documentsResult, blocksResult, bookingsResult] = await Promise.all([
    admin.from("vehicles").select("*").eq("id", id).maybeSingle(),
    admin.from("vehicle_documents").select("*").eq("vehicle_id", id).order("expires_on", { ascending: false }),
    admin.from("vehicle_blocks").select("*").eq("vehicle_id", id).order("start_at", { ascending: false }),
    admin.from("bookings").select("id,customer_id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,status,created_at,customer:customers(full_name,phone)").eq("vehicle_id", id).order("start_at", { ascending: false }),
  ]);
  if (vehicleResult.error) throw vehicleResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (blocksResult.error) throw blocksResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (!vehicleResult.data) return null;
  const bookings = bookingsResult.data || [];
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 90 * 86_400_000);
  const counted = bookings.filter((booking) => booking.status !== "cancelled").map((booking) => ({ startAt: booking.start_at, endAt: booking.end_at }));
  const revenue = bookings.filter((booking) => booking.status === "completed").reduce((sum, booking) => sum + Number(booking.amount_total || 0), 0);
  return {
    vehicle: vehicleResult.data as Vehicle,
    documents: (documentsResult.data || []) as VehicleDocument[],
    blocks: (blocksResult.data || []) as VehicleBlock[],
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
  vehicleId: string; docType: DocumentType; provider: string; referenceNumber: string;
  issuedOn?: string; expiresOn: string; notes: string;
}) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("vehicle_documents").insert({
    vehicle_id: input.vehicleId,
    doc_type: input.docType,
    provider: input.provider.trim() || null,
    reference_number: input.referenceNumber.trim() || null,
    issued_on: input.issuedOn || null,
    expires_on: input.expiresOn,
    notes: input.notes.trim() || null,
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
  const stale = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  const [documents, overdue, unassigned, enquiries, assignedBookings, blocks] = await Promise.all([
    admin.from("vehicle_alerts").select("*").order("days_remaining"),
    admin.from("bookings").select("id,end_at,vehicle:vehicles(registration_number,display_name),customer:customers(full_name,phone)").eq("status", "ongoing").lt("end_at", now.toISOString()).order("end_at"),
    admin.from("bookings").select("id,start_at,car_slug,customer:customers(full_name,phone)").eq("status", "confirmed").is("vehicle_id", null).order("start_at"),
    admin.from("enquiries").select("id,created_at,car_slug,customer:customers(full_name,phone)").eq("status", "new").lt("created_at", stale).order("created_at"),
    admin.from("bookings").select("id,vehicle_id,start_at,end_at,vehicle:vehicles(registration_number)").not("vehicle_id", "is", null).in("status", ["confirmed", "ongoing"]),
    admin.from("vehicle_blocks").select("id,vehicle_id,start_at,end_at,reason"),
  ]);
  if (documents.error) throw documents.error;
  if (overdue.error) throw overdue.error;
  if (unassigned.error) throw unassigned.error;
  if (enquiries.error) throw enquiries.error;
  if (assignedBookings.error) throw assignedBookings.error;
  if (blocks.error) throw blocks.error;
  const conflicts = (assignedBookings.data || []).flatMap((booking) => {
    const conflict = (blocks.data || []).find((block) => block.vehicle_id === booking.vehicle_id && rangesOverlap(booking.start_at, booking.end_at, block.start_at, block.end_at));
    if (!conflict) return [];
    const vehicle = Array.isArray(booking.vehicle) ? booking.vehicle[0] : booking.vehicle;
    return [{ bookingId: booking.id, vehicleId: booking.vehicle_id as string, registrationNumber: vehicle?.registration_number || "Vehicle", reason: conflict.reason }];
  });
  return {
    documents: (documents.data || []) as VehicleAlert[],
    overdue: overdue.data || [],
    unassigned: unassigned.data || [],
    staleEnquiries: enquiries.data || [],
    conflicts,
  };
}
