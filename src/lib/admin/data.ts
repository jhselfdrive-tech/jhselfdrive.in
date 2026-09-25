import "server-only";
import { quoteRental } from "@/lib/bookings/pricing";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { deriveSegments, type Segment } from "./segments";
import { isMissingSchema } from "./schema";
import type { ChecklistFacts } from "./checklist";
import { BLOCKING_STATUSES, type BookingStatus, isBookingStatus, templateForTransition } from "@/lib/bookings/status";
import { queueMessageForBooking, type QueuedMessage } from "./messages";
import { recordPayment } from "./payments";

export type { BookingStatus };

export type CustomerSummary = {
  id: string; phone: string; full_name: string | null; email: string | null; city: string | null;
  enquiry_count: number; first_seen_at: string; last_seen_at: string; tags: string[]; notes: string | null;
  booking_count: number; completed_booking_count: number; lifetime_value: number; last_booking_at: string | null;
  segments: Segment[];
};

export type Booking = {
  id: string; customer_id: string; enquiry_id: string | null; car_slug: string; vehicle_id: string | null;
  start_at: string; end_at: string; start_date: string; end_date: string;
  amount_total: number; deposit: number; deposit_returned: boolean; status: BookingStatus; notes: string | null;
  created_by: string; created_at: string; customer: { id: string; full_name: string | null; phone: string } | null;
  vehicle: { id: string; registration_number: string; display_name: string | null } | null;
  checklist?: ChecklistFacts;
};

function asNumber(value: unknown) { return Number(value || 0); }

function mapCustomer(row: Record<string, unknown>): CustomerSummary {
  const stats = {
    completed_booking_count: asNumber(row.completed_booking_count), booking_count: asNumber(row.booking_count),
    last_seen_at: String(row.last_seen_at),
  };
  return { ...(row as Omit<CustomerSummary, "segments" | "lifetime_value">), lifetime_value: asNumber(row.lifetime_value), segments: deriveSegments(stats) } as CustomerSummary;
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
  const [customerResult, initialBookingsResult] = await Promise.all([
    admin.from("customer_stats").select("*").eq("id", id).maybeSingle(),
    admin.from("bookings").select("id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,vehicle:vehicles(id,registration_number,display_name)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  let bookingsResult = initialBookingsResult;
  if (isMissingSchema(initialBookingsResult.error)) {
    bookingsResult = await admin.from("bookings").select("id,enquiry_id,car_slug,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at").eq("customer_id", id).order("created_at", { ascending: false }) as typeof initialBookingsResult;
  }
  if (customerResult.error) throw customerResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (!customerResult.data) return null;
  return { customer: mapCustomer(customerResult.data as Record<string, unknown>), bookings: bookingsResult.data || [] };
}

export async function listBookings(filters: { status?: string; search?: string; from?: string; to?: string; limit?: number; cursor?: { startAt: string; id: string } } = {}) {
  await verifyAdmin();
  const customerJoin = filters.search ? "customer:customers!inner(id,full_name,phone)" : "customer:customers(id,full_name,phone)";
  let query = getSupabaseAdmin().from("bookings").select(`id,customer_id,enquiry_id,car_slug,vehicle_id,start_at,end_at,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,${customerJoin},vehicle:vehicles(id,registration_number,display_name)` as const).order("start_at", { ascending: false }).order("id", { ascending: false }).limit(filters.limit ?? 250);
  if (filters.status === "active") query = query.in("status", ["approved", "confirmed", "ongoing"]);
  else if (filters.status === "upcoming") query = query.in("status", ["approved", "confirmed"]).gte("start_at", new Date().toISOString());
  else if (filters.status === "overdue") query = query.eq("status","ongoing").lt("end_at",new Date().toISOString());
  else if (filters.status === "pickups") {
    const day = new Date(Date.now() + 330 * 60000).toISOString().slice(0,10);
    const start = new Date(`${day}T00:00:00+05:30`);
    query = query.in("status",["approved","confirmed"]).gte("start_at",start.toISOString()).lt("start_at",new Date(start.getTime()+86400000).toISOString());
  } else if (filters.status === "messages") {
    const due = await getSupabaseAdmin().from("booking_messages").select("booking_id").eq("status","due");
    if (due.error) throw due.error;
    const ids = [...new Set((due.data || []).map(row => row.booking_id))];
    if (!ids.length) return [];
    query = query.in("id",ids);
  } else if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.search) {
    const safe = filters.search.replace(/[^a-zA-Z0-9 +]/g, "");
    query = query.or(`phone.ilike.%${safe}%,full_name.ilike.%${safe}%`, { referencedTable: "customer" });
  }
  if (filters.from) query = query.gt("end_at", filters.from);
  if (filters.to) query = query.lt("start_at", filters.to);
  if (filters.cursor) query = query.or(`start_at.lt.${filters.cursor.startAt},and(start_at.eq.${filters.cursor.startAt},id.lt.${filters.cursor.id})`);
  let { data, error } = await query;
  if (isMissingSchema(error) && !filters.search && !filters.from && !filters.to && !filters.cursor && !filters.limit) {
    let fallback = getSupabaseAdmin().from("bookings").select("id,customer_id,enquiry_id,car_slug,start_date,end_date,amount_total,deposit,deposit_returned,status,notes,created_by,created_at,customer:customers(id,full_name,phone)").order("start_date", { ascending: false }).limit(250);
    if (filters.status && filters.status !== "all") fallback = fallback.eq("status", filters.status);
    const legacy = await fallback;
    data = legacy.data as typeof data;
    error = legacy.error;
  }
  if (error) throw error;
  const bookings = (data || []) as unknown as Booking[];
  if (!bookings.length) return bookings;
  const checklistResult = await getSupabaseAdmin().from("booking_checklist_status").select("*").in("booking_id", bookings.map((booking) => booking.id));
  if (checklistResult.error && !isMissingSchema(checklistResult.error)) throw checklistResult.error;
  if (checklistResult.error) return bookings;
  const checklist = new Map((checklistResult.data || []).map((row) => [row.booking_id, row as ChecklistFacts]));
  return bookings.map((booking) => ({ ...booking, checklist: checklist.get(booking.id) }));
}

export type BookingTransition = {
  from: BookingStatus;
  to: BookingStatus;
  templateId: ReturnType<typeof templateForTransition>;
  /** The queued customer message to prompt for, if one is outstanding. */
  message: QueuedMessage | null;
};

/**
 * The single writer for booking status. The RPC holds a row lock while it
 * validates the edge, the vehicle requirement and availability, so two admins
 * acting at once cannot drive a booking into an illegal state.
 */
export async function transitionBooking(input: {
  bookingId: string;
  to: BookingStatus;
  note?: string;
  vehicleId?: string;
  amountTotal?: number;
  deposit?: number;
  depositReturned?: boolean;
}): Promise<BookingTransition> {
  const adminUser = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().rpc("transition_booking", {
    p_booking_id: input.bookingId,
    p_to_status: input.to,
    p_actor: adminUser.email,
    p_note: input.note?.trim() || null,
    p_vehicle_id: input.vehicleId || null,
    p_amount_total: typeof input.amountTotal === "number" ? input.amountTotal : null,
    p_deposit: typeof input.deposit === "number" ? input.deposit : null,
    p_deposit_returned: typeof input.depositReturned === "boolean" ? input.depositReturned : null,
  });
  if (error) throw normaliseRpcError(error);
  const row = (data as Array<{ from_status: string; to_status: string }> | null)?.[0];
  const from = isBookingStatus(row?.from_status) ? row!.from_status : input.to;

  // Queue the customer notification here rather than in the action, so no
  // caller of transitionBooking can forget to.
  const message = await queueMessageForBooking(input.bookingId, { kind: "status", to: input.to }, {
    note: input.note?.trim() || null,
  });

  return { from, to: input.to, templateId: templateForTransition(from, input.to), message };
}

/**
 * Deposit return is a money fact, not a lifecycle edge, so it moves on its own.
 * Marking it returned also records a refund on the ledger, which is what
 * produces the customer's refund notification.
 */
export async function setDepositReturned(bookingId: string, depositReturned: boolean) {
  const adminUser = await verifyAdmin();
  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await admin.from("bookings").select("status,deposit").eq("id", bookingId).maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw Object.assign(new Error("BOOKING_NOT_FOUND"), { code: "BOOKING_NOT_FOUND" });
  const { error } = await admin.from("bookings").update({ deposit_returned: depositReturned }).eq("id", bookingId);
  if (error) throw error;
  await admin.from("booking_status_events").insert({
    booking_id: bookingId,
    from_status: booking?.status || null,
    to_status: booking?.status || "completed",
    note: depositReturned ? "Deposit returned" : "Deposit marked as held",
    created_by: adminUser.email,
  });

  if (!depositReturned) return null;
  const held = await depositHeld(bookingId);
  if (held <= 0) return null;
  const paymentId = await recordPayment({ bookingId, kind: "refund", amount: held, method: "cash", note: "Deposit returned to customer" });
  return queueMessageForBooking(bookingId, { kind: "payment", paymentId, paymentKind: "refund" }, {
    amountPaid: held,
    depositAmount: held,
  });
}

/** Deposit taken minus anything already refunded. */
async function depositHeld(bookingId: string) {
  const { data, error } = await getSupabaseAdmin().from("booking_payments").select("kind,amount").eq("booking_id", bookingId);
  if (error) {
    if (isMissingSchema(error)) return 0;
    throw error;
  }
  return (data || []).reduce((sum, row) => sum + (row.kind === "deposit" ? Number(row.amount) : row.kind === "refund" ? -Number(row.amount) : 0), 0);
}

export async function listBookingStatusEvents(bookingId: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_status_events")
    .select("id,from_status,to_status,note,message_template_id,message_sent_at,created_by,created_at")
    .eq("booking_id", bookingId)
    .order("created_at");
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data || []) as BookingStatusEvent[];
}

export type BookingStatusEvent = {
  id: string; from_status: string | null; to_status: string; note: string | null;
  message_template_id: string | null; message_sent_at: string | null; created_by: string; created_at: string;
};

/** Turns the RPC's raise-exception messages into codes the actions can map to copy. */
function normaliseRpcError(error: { message?: string; code?: string }) {
  const message = error.message || "";
  for (const code of ["ILLEGAL_TRANSITION", "VEHICLE_REQUIRED", "VEHICLE_UNAVAILABLE", "BOOKING_NOT_FOUND"]) {
    if (message.includes(code)) return Object.assign(new Error(message), { code });
  }
  return Object.assign(new Error(message || "Transition failed"), { code: error.code || "" });
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
  customerId: string; carSlug: string; vehicleId?: string; startAt: string; endAt: string;
  amountTotal: number; deposit: number; status: BookingStatus; notes: string;
}) {
  const adminUser = await verifyAdmin();
  const supabase = getSupabaseAdmin();
  if (!input.customerId) throw new Error("Customer is required");
  if (input.vehicleId && BLOCKING_STATUSES.includes(input.status)) {
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
  await supabase.from("booking_status_events").insert({
    booking_id: data.id, from_status: null, to_status: input.status,
    note: "Created in the admin panel", created_by: adminUser.email,
  });
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
  const [initialBookings, events] = await Promise.all([
    admin.from("bookings").select("id,car_slug,status,amount_total,vehicle_id,start_at,created_at,vehicle:vehicles(registration_number,display_name)").gte("created_at", from.toISOString()),
    admin.from("events").select("name,utm_source,referrer,created_at").gte("created_at", from.toISOString()),
  ]);
  let bookings = initialBookings;
  if (isMissingSchema(initialBookings.error)) {
    bookings = await admin.from("bookings").select("id,car_slug,status,amount_total,start_date,created_at").gte("created_at", from.toISOString()) as typeof initialBookings;
  }
  if (bookings.error) throw bookings.error;
  if (events.error) throw events.error;
  const bookingRows = bookings.data || [];
  const eventRows = events.data || [];
  const thisWeek = bookingRows.filter((row) => new Date(row.created_at) >= weekStart).length;
  const lastWeek = bookingRows.filter((row) => new Date(row.created_at) >= previousWeekStart && new Date(row.created_at) < weekStart).length;
  const completed = bookingRows.filter((row) => row.status === "completed");
  const revenueThisMonth = completed.filter((row) => new Date(row.created_at) >= monthStart).reduce((sum, row) => sum + asNumber(row.amount_total), 0);
  const activeBookings = bookingRows.filter((row) => row.status === "confirmed" || row.status === "ongoing").length;
  const pendingBookings = bookingRows.filter((row) => row.status === "requested").length;
  // A request that reached any committed state counts as converted; a request
  // still sitting in the inbox does not.
  const convertedBookings = bookingRows.filter((row) => BLOCKING_STATUSES.includes(row.status as BookingStatus)).length;
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
  bookingRows.forEach((row) => {
    const date = new Date(row.created_at); const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
    const key = date.toISOString().slice(0, 10); weekBuckets.set(key, (weekBuckets.get(key) || 0) + 1);
  });
  const carCounts = new Map<string, number>();
  bookingRows.forEach((row) => carCounts.set(row.car_slug, (carCounts.get(row.car_slug) || 0) + 1));
  const sourceCounts = new Map<string, number>();
  eventRows.filter((row) => row.name === "page_view").forEach((row) => {
    let source = row.utm_source || "direct";
    if (!row.utm_source && row.referrer) {
      try { source = new URL(row.referrer).hostname.replace(/^www\./, ""); } catch { source = row.referrer.slice(0, 50); }
    }
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });
  const eventCount = (name: string) => eventRows.filter((row) => row.name === name).length;
  return {
    thisWeek, lastWeek, weekChange: lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek ? 100 : 0,
    conversionRate: bookingRows.length ? Math.round((convertedBookings / bookingRows.length) * 100) : 0,
    revenueThisMonth, activeBookings, pendingBookings,
    trend: [...weekBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value })),
    funnel: [
      { label: "Page views", value: eventCount("page_view") },
      { label: "Booking started", value: eventCount("booking_started") },
      { label: "Dates chosen", value: eventCount("booking_dates_selected") },
      { label: "Requested", value: bookingRows.length },
      { label: "Confirmed", value: convertedBookings },
    ],
    topCars: [...carCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, value]) => ({ slug, value })),
    sources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
    vehicleRevenue: [...vehicleRevenue.values()].sort((a, b) => b.value - a.value).slice(0, 6),
  };
}

export async function quoteBooking(vehicleId: string, startAt: string, endAt: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("vehicles").select("day_rate,deposit").eq("id", vehicleId).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("VEHICLE_NOT_FOUND"), { code: "VEHICLE_NOT_FOUND" });
  return { ...quoteRental(Number(data.day_rate), startAt, endAt), dayRate: Number(data.day_rate), deposit: Number(data.deposit) };
}
export async function createAdminBooking(input: {
  customerId?: string; customer?: { phone: string; fullName: string; city: string };
  vehicleId: string; startAt: string; endAt: string; status: "approved" | "confirmed" | "ongoing" | "completed";
  amountTotal?: number; deposit?: number; notes: string;
}) {
  const admin = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().rpc("record_admin_booking", {
    p_customer_id: input.customerId ?? null, p_phone: input.customer?.phone ?? null,
    p_full_name: input.customer?.fullName ?? null, p_city: input.customer?.city ?? null,
    p_vehicle_id: input.vehicleId, p_start_at: input.startAt, p_end_at: input.endAt,
    p_status: input.status, p_created_by: admin.email, p_amount_total: input.amountTotal ?? null,
    p_deposit: input.deposit ?? null, p_notes: input.notes,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Booking was not returned");
  return { bookingId: row.booking_id as string, customerId: row.customer_id as string,
    amountTotal: Number(row.amount_total), deposit: Number(row.deposit), days: Number(row.days) };
}

export async function updateCustomerProfile(id: string, patch: import('zod').output<typeof import('@/lib/ops/schemas').customerPatchSchema>) {
  await verifyAdmin();
  const fields: Record<string,unknown> = {};
  for (const [key,value] of Object.entries(patch)) {
    fields[key === 'fullName' ? 'full_name' : key] = key === 'tags'
      ? [...new Set((value as string[]).map(tag => tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'')).filter(Boolean))].slice(0,12)
      : value === '' ? null : value;
  }
  const {data,error} = await getSupabaseAdmin().from('customers').update(fields).eq('id',id).select('id').maybeSingle();
  if (error?.code === '23505') throw Object.assign(new Error('CUSTOMER_PHONE_EXISTS'),{code:'CUSTOMER_PHONE_EXISTS'});
  if (error) throw error;
  if (!data) throw new Error('CUSTOMER_NOT_FOUND');
}
