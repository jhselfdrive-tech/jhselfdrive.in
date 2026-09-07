import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { deriveSegments, type Segment } from "./segments";

export type EnquiryStatus = "new" | "contacted" | "converted" | "lost";
export type BookingStatus = "confirmed" | "ongoing" | "completed" | "cancelled";

export type CustomerSummary = {
  id: string; phone: string; full_name: string | null; email: string | null; city: string | null;
  enquiry_count: number; first_seen_at: string; last_seen_at: string; tags: string[]; notes: string | null;
  booking_count: number; completed_booking_count: number; lifetime_value: number; last_booking_at: string | null;
  segments: Segment[];
};

export type Enquiry = {
  id: string; customer_id: string; car_slug: string; pickup_date: string; return_date: string;
  message: string | null; status: EnquiryStatus; source: string; utm_source: string | null;
  utm_medium: string | null; utm_campaign: string | null; created_at: string;
  customer: { id: string; full_name: string | null; phone: string; enquiry_count: number } | null;
};

export type Booking = {
  id: string; customer_id: string; enquiry_id: string | null; car_slug: string; vehicle_id: string | null;
  start_at: string; end_at: string; start_date: string; end_date: string;
  amount_total: number; deposit: number; deposit_returned: boolean; status: BookingStatus; notes: string | null;
  created_by: string; created_at: string; customer: { id: string; full_name: string | null; phone: string } | null;
  vehicle: { id: string; registration_number: string; display_name: string | null } | null;
};

function asNumber(value: unknown) { return Number(value || 0); }

function isFleetSchemaMissing(error: { code?: string } | null) {
  return Boolean(error && ["PGRST200", "PGRST205", "42703", "42P01"].includes(error.code || ""));
}

function mapCustomer(row: Record<string, unknown>): CustomerSummary {
  const stats = {
    completed_booking_count: asNumber(row.completed_booking_count), booking_count: asNumber(row.booking_count),
    enquiry_count: asNumber(row.enquiry_count), last_seen_at: String(row.last_seen_at),
  };
  return { ...(row as Omit<CustomerSummary, "segments" | "lifetime_value">), lifetime_value: asNumber(row.lifetime_value), segments: deriveSegments(stats) } as CustomerSummary;
}

export async function listEnquiries(filters: { status?: string; car?: string; from?: string; to?: string } = {}) {
  await verifyAdmin();
  let query = getSupabaseAdmin().from("enquiries").select("id,customer_id,car_slug,pickup_date,return_date,message,status,source,utm_source,utm_medium,utm_campaign,created_at,customer:customers(id,full_name,phone,enquiry_count)").order("created_at", { ascending: false }).limit(250);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.car && filters.car !== "all") query = query.eq("car_slug", filters.car);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Enquiry[];
}

export async function getEnquiry(id: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("enquiries").select("id,customer_id,car_slug,pickup_date,return_date,message,status,source,utm_source,utm_medium,utm_campaign,created_at,customer:customers(id,full_name,phone,enquiry_count)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Enquiry | null;
}

export async function listCustomers(filters: { search?: string; segment?: string } = {}) {
  await verifyAdmin();
  let query = getSupabaseAdmin().from("customer_stats").select("*").order("last_seen_at", { ascending: false }).limit(250);
  if (filters.search) {
    const safeSearch = filters.search.replace(/[^a-zA-Z0-9 +]/g, "");
    query = query.or(`phone.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const customers = (data || []).map((row) => mapCustomer(row as Record<string, unknown>));
  return filters.segment && filters.segment !== "all" ? customers.filter((customer) => customer.segments.includes(filters.segment as Segment)) : customers;
}

export async function getCustomer(id: string) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const [customerResult, enquiriesResult, initialBookingsResult] = await Promise.all([
    admin.from("customer_stats").select("*").eq("id", id).maybeSingle(),
    admin.from("enquiries").select("id,car_slug,pickup_date,return_date,message,status,source,created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    admin.from("bookings").select("id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,vehicle:vehicles(id,registration_number,display_name)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  let bookingsResult = initialBookingsResult;
  if (isFleetSchemaMissing(initialBookingsResult.error)) {
    bookingsResult = await admin.from("bookings").select("id,enquiry_id,car_slug,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at").eq("customer_id", id).order("created_at", { ascending: false }) as typeof initialBookingsResult;
  }
  if (customerResult.error) throw customerResult.error;
  if (enquiriesResult.error) throw enquiriesResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (!customerResult.data) return null;
  return { customer: mapCustomer(customerResult.data as Record<string, unknown>), enquiries: enquiriesResult.data || [], bookings: bookingsResult.data || [] };
}

export async function listBookings(filters: { status?: string } = {}) {
  await verifyAdmin();
  let query = getSupabaseAdmin().from("bookings").select("id,customer_id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,customer:customers(id,full_name,phone),vehicle:vehicles(id,registration_number,display_name)").order("start_at", { ascending: false }).limit(250);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  let { data, error } = await query;
  if (isFleetSchemaMissing(error)) {
    let fallback = getSupabaseAdmin().from("bookings").select("id,customer_id,enquiry_id,car_slug,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,customer:customers(id,full_name,phone)").order("start_date", { ascending: false }).limit(250);
    if (filters.status && filters.status !== "all") fallback = fallback.eq("status", filters.status);
    const legacy = await fallback;
    data = legacy.data as typeof data;
    error = legacy.error;
  }
  if (error) throw error;
  return (data || []) as unknown as Booking[];
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("enquiries").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateBookingStatus(id: string, status: BookingStatus, depositReturned?: boolean) {
  await verifyAdmin();
  const update: { status: BookingStatus; deposit_returned?: boolean } = { status };
  if (typeof depositReturned === "boolean") update.deposit_returned = depositReturned;
  const { error } = await getSupabaseAdmin().from("bookings").update(update).eq("id", id);
  if (error) throw error;
}

export async function updateCustomerTags(id: string, tags: string[]) {
  await verifyAdmin();
  const cleanTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")).filter(Boolean))].slice(0, 12);
  const { error } = await getSupabaseAdmin().from("customers").update({ tags: cleanTags }).eq("id", id);
  if (error) throw error;
}

export async function updateCustomerNotes(id: string, notes: string) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().from("customers").update({ notes: notes.trim() || null }).eq("id", id);
  if (error) throw error;
}

export async function createBooking(input: {
  enquiryId?: string; customerId?: string; carSlug: string; vehicleId?: string; startAt: string; endAt: string;
  amountTotal: number; deposit: number; status: BookingStatus; notes: string;
}) {
  const adminUser = await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (input.enquiryId) {
    const { data, error } = await supabase.rpc("create_booking_from_enquiry", {
      p_enquiry_id: input.enquiryId, p_car_slug: input.carSlug, p_vehicle_id: input.vehicleId || null,
      p_start_at: input.startAt, p_end_at: input.endAt,
      p_amount_total: input.amountTotal, p_deposit: input.deposit, p_status: input.status, p_notes: input.notes,
      p_created_by: adminUser.email,
    });
    if (error) throw error;
    return data as string;
  }
  if (!input.customerId) throw new Error("Customer is required");
  if (input.vehicleId && input.status !== "cancelled") {
    const { data: available, error: availabilityError } = await supabase.rpc("find_available_vehicles", {
      p_category_slug: input.carSlug, p_start_at: input.startAt, p_end_at: input.endAt, p_exclude_booking_id: null,
    });
    if (availabilityError) throw availabilityError;
    if (!(available || []).some((vehicle: { id: string }) => vehicle.id === input.vehicleId)) {
      throw Object.assign(new Error("Vehicle unavailable"), { code: "VEHICLE_UNAVAILABLE" });
    }
  }
  const { data, error } = await supabase.from("bookings").insert({
    customer_id: input.customerId, car_slug: input.carSlug, vehicle_id: input.vehicleId || null,
    start_at: input.startAt, end_at: input.endAt,
    amount_total: input.amountTotal, deposit: input.deposit, status: input.status, notes: input.notes || null,
    created_by: adminUser.email,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function getDashboardMetrics(days = 56) {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const now = new Date();
  const from = new Date(now.getTime() - days * 86400000);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const previousWeekStart = new Date(now); previousWeekStart.setDate(now.getDate() - 14);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [enquiries, initialBookings, events] = await Promise.all([
    admin.from("enquiries").select("id,car_slug,status,source,utm_source,created_at").gte("created_at", from.toISOString()),
    admin.from("bookings").select("id,status,amount_total,vehicle_id,start_at,created_at,vehicle:vehicles(registration_number,display_name)").gte("created_at", from.toISOString()),
    admin.from("events").select("name,utm_source,referrer,created_at").gte("created_at", from.toISOString()),
  ]);
  let bookings = initialBookings;
  if (isFleetSchemaMissing(initialBookings.error)) {
    bookings = await admin.from("bookings").select("id,status,amount_total,start_date,created_at").gte("created_at", from.toISOString()) as typeof initialBookings;
  }
  if (enquiries.error) throw enquiries.error;
  if (bookings.error) throw bookings.error;
  if (events.error) throw events.error;
  const enquiryRows = enquiries.data || [];
  const bookingRows = bookings.data || [];
  const eventRows = events.data || [];
  const thisWeek = enquiryRows.filter((row) => new Date(row.created_at) >= weekStart).length;
  const lastWeek = enquiryRows.filter((row) => new Date(row.created_at) >= previousWeekStart && new Date(row.created_at) < weekStart).length;
  const completed = bookingRows.filter((row) => row.status === "completed");
  const revenueThisMonth = completed.filter((row) => new Date(row.created_at) >= monthStart).reduce((sum, row) => sum + asNumber(row.amount_total), 0);
  const activeBookings = bookingRows.filter((row) => row.status === "confirmed" || row.status === "ongoing").length;
  const vehicleRevenue = new Map<string, { label: string; value: number }>();
  completed.forEach((row) => {
    if (!row.vehicle_id) return;
    const vehicle = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle;
    const label = vehicle?.display_name || vehicle?.registration_number || "Assigned vehicle";
    const current = vehicleRevenue.get(row.vehicle_id) || { label, value: 0 };
    current.value += asNumber(row.amount_total);
    vehicleRevenue.set(row.vehicle_id, current);
  });
  const weekBuckets = new Map<string, number>();
  enquiryRows.forEach((row) => {
    const date = new Date(row.created_at); const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
    const key = date.toISOString().slice(0, 10); weekBuckets.set(key, (weekBuckets.get(key) || 0) + 1);
  });
  const carCounts = new Map<string, number>();
  enquiryRows.forEach((row) => carCounts.set(row.car_slug, (carCounts.get(row.car_slug) || 0) + 1));
  const sourceCounts = new Map<string, number>();
  const sourceEvents = eventRows.filter((row) => row.name === "page_view");
  if (sourceEvents.length) {
    sourceEvents.forEach((row) => {
      let source = row.utm_source || "direct";
      if (!row.utm_source && row.referrer) {
        try { source = new URL(row.referrer).hostname.replace(/^www\./, ""); } catch { source = row.referrer.slice(0, 50); }
      }
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
  } else {
    enquiryRows.forEach((row) => { const source = row.utm_source || row.source || "direct"; sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1); });
  }
  const eventCount = (name: string) => eventRows.filter((row) => row.name === name).length;
  return {
    thisWeek, lastWeek, weekChange: lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek ? 100 : 0,
    conversionRate: enquiryRows.length ? Math.round((completed.length / enquiryRows.length) * 100) : 0,
    revenueThisMonth, activeBookings,
    trend: [...weekBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value })),
    funnel: [
      { label: "Page views", value: eventCount("page_view") }, { label: "Enquiry started", value: eventCount("enquiry_started") },
      { label: "Submitted", value: eventCount("enquiry_submitted") }, { label: "Booked", value: bookingRows.length },
    ],
    topCars: [...carCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, value]) => ({ slug, value })),
    sources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
    vehicleRevenue: [...vehicleRevenue.values()].sort((a, b) => b.value - a.value).slice(0, 6),
  };
}
