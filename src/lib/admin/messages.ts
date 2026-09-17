import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";
import { isMissingSchema } from "./schema";
import { eventKey, templateForEvent, type BookingEvent, type ReminderKind } from "@/lib/messages/events";
import { composeMessage, type MessageContext, type MessageTemplateId } from "@/lib/messages/templates";
import { paymentSummary, type ChecklistFacts } from "./checklist";
import { isShareLinkUsable } from "@/lib/share/token";
import { site } from "@/content/site";

export type MessageStatus = "due" | "sent" | "skipped";

/** Just enough of a queued message for the UI to prompt without a re-fetch. */
export type QueuedMessage = { id: string; body: string; phone: string };

export type BookingMessage = {
  id: string;
  booking_id: string;
  event_key: string;
  template_id: MessageTemplateId;
  body: string;
  phone: string;
  status: MessageStatus;
  sent_at: string | null;
  skipped_reason: string | null;
  actor: string | null;
  created_at: string;
};

/** A reminder that is due but has no row yet — derived from booking dates. */
export type DueReminder = {
  bookingId: string;
  reminder: ReminderKind;
  onDate: string;
  customerName: string | null;
  phone: string;
  startAt: string;
  endAt: string;
  vehicleLabel: string | null;
  /** Composed up front so the alert can offer a one-tap WhatsApp link. */
  body: string;
};

/**
 * Records that a customer message is due for an event, composing the body now
 * so the log shows what was actually offered even if templates change later.
 *
 * Idempotent by (booking_id, event_key): calling it twice for the same event
 * — which happens by design, since a status change and its handover share a
 * key — leaves the first row untouched and sends nothing extra.
 *
 * Deliberately does not call verifyAdmin(): it is an internal helper invoked
 * from server paths that have already authorised (the admin actions) or that
 * are the customer's own booking submission. It returns only an id.
 */
export async function queueMessage(
  bookingId: string,
  event: BookingEvent,
  context: MessageContext,
  phone: string,
): Promise<QueuedMessage | null> {
  const templateId = templateForEvent(event);
  if (!templateId || !phone) return null;

  const key = eventKey(event);
  const { body } = composeMessage(templateId, context);
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("booking_messages")
    .upsert(
      { booking_id: bookingId, event_key: key, template_id: templateId, body, phone, status: "due" },
      { onConflict: "booking_id,event_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    // A missing table means 0007 has not been applied; the booking action it
    // is called from must still succeed.
    if (isMissingSchema(error)) return null;
    throw error;
  }
  if (data?.id) return { id: data.id as string, body, phone };

  // ignoreDuplicates returns no row when one already existed — the deliberate
  // case where a status change and its handover share a key. Re-read it so the
  // caller can still prompt if that message is genuinely outstanding.
  const existing = await admin
    .from("booking_messages")
    .select("id,status,body,phone")
    .eq("booking_id", bookingId)
    .eq("event_key", key)
    .maybeSingle();
  if (existing.error || !existing.data || existing.data.status !== "due") return null;
  return { id: existing.data.id as string, body: existing.data.body as string, phone: existing.data.phone as string };
}

/**
 * Everything the templates need about one booking, assembled once so each
 * event path does not rebuild it. Returns null when there is no phone number
 * to message.
 */
export async function bookingMessageContext(bookingId: string) {
  const admin = getSupabaseAdmin();
  const [bookingResult, checklistResult, linksResult] = await Promise.all([
    admin.from("bookings")
      .select("id,car_slug,start_at,end_at,amount_total,deposit,status,customer:customers(full_name,phone),vehicle:vehicles(registration_number,display_name,model)")
      .eq("id", bookingId).maybeSingle(),
    admin.from("booking_checklist_status").select("*").eq("booking_id", bookingId).maybeSingle(),
    admin.from("booking_share_links").select("token,expires_at,revoked_at").eq("booking_id", bookingId),
  ]);
  if (bookingResult.error) throw bookingResult.error;
  const booking = bookingResult.data;
  if (!booking) return null;

  const customer = first(booking.customer as never);
  const phone = (customer as { phone?: string } | null)?.phone;
  if (!phone) return null;
  const vehicle = first(booking.vehicle as never) as { registration_number: string; display_name: string | null; model: string | null } | null;

  const checklist = (checklistResult.error ? null : checklistResult.data) as ChecklistFacts | null;
  const payments = paymentSummary({ ...checklist, amount_total: booking.amount_total });

  const usable = (linksResult.error ? [] : linksResult.data || []).find((link) => isShareLinkUsable(link));
  const carLabel = site.fleet.find((car) => car.slug === booking.car_slug)?.name || booking.car_slug;

  const context: MessageContext = {
    customerName: (customer as { full_name?: string | null } | null)?.full_name ?? null,
    carLabel,
    vehicleLabel: vehicle ? `${vehicle.display_name || vehicle.model || carLabel} · ${vehicle.registration_number}` : null,
    startAt: booking.start_at,
    endAt: booking.end_at,
    amountTotal: Number(booking.amount_total),
    amountBalance: payments.balance,
    depositAmount: payments.deposit || Number(booking.deposit),
    shareUrl: usable ? `${site.siteUrl.replace(/\/$/, "")}/r/${usable.token}` : null,
  };
  return { context, phone, booking };
}

/** Composes and queues the message for an event using the booking's own context. */
export async function queueMessageForBooking(bookingId: string, event: BookingEvent, extra: MessageContext = {}) {
  const resolved = await bookingMessageContext(bookingId);
  if (!resolved) return null;
  return queueMessage(bookingId, event, { ...resolved.context, ...extra }, resolved.phone);
}

export async function listBookingMessages(bookingId: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_messages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at");
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data || []) as BookingMessage[];
}

export async function getBookingMessage(id: string) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().from("booking_messages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as BookingMessage | null) ?? null;
}

export async function markMessageSent(id: string) {
  const adminUser = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_messages")
    .update({ status: "sent", sent_at: new Date().toISOString(), actor: adminUser.email, skipped_reason: null })
    .eq("id", id)
    .select("booking_id")
    .maybeSingle();
  if (error) throw error;
  return data?.booking_id as string | undefined;
}

export async function markMessageSkipped(id: string, reason: string) {
  const adminUser = await verifyAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("booking_messages")
    .update({ status: "skipped", skipped_reason: reason.trim() || null, actor: adminUser.email, sent_at: null })
    .eq("id", id)
    .select("booking_id")
    .maybeSingle();
  if (error) throw error;
  return data?.booking_id as string | undefined;
}

type ReminderRow = {
  id: string; start_at: string; end_at: string; status: string;
  customer: { full_name: string | null; phone: string } | { full_name: string | null; phone: string }[] | null;
  vehicle: { registration_number: string; display_name: string | null } | { registration_number: string; display_name: string | null }[] | null;
};

const first = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] || null : value);
const istDate = (value: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

/**
 * Time-based reminders that are due right now.
 *
 * Derived rather than stored: nothing is written until an operator acts on one,
 * so there is no cron job and no write on a read path. Anything already sent or
 * skipped for the same day is filtered out.
 */
export async function dueReminders(): Promise<DueReminder[]> {
  await verifyAdmin();
  const admin = getSupabaseAdmin();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3_600_000);
  const in48h = new Date(now.getTime() + 48 * 3_600_000);

  const select = "id,start_at,end_at,status,customer:customers(full_name,phone),vehicle:vehicles(registration_number,display_name)";
  const [pickups, returns, overdue] = await Promise.all([
    // Pickup within the next 24-48h, car already committed.
    admin.from("bookings").select(select).in("status", ["approved", "confirmed"]).gte("start_at", now.toISOString()).lte("start_at", in48h.toISOString()),
    // Return coming up while the car is out.
    admin.from("bookings").select(select).eq("status", "ongoing").gte("end_at", now.toISOString()).lte("end_at", in24h.toISOString()),
    // Return time has passed and the car is still out.
    admin.from("bookings").select(select).eq("status", "ongoing").lt("end_at", now.toISOString()),
  ]);
  if (pickups.error) throw pickups.error;
  if (returns.error) throw returns.error;
  if (overdue.error) throw overdue.error;

  const candidates: DueReminder[] = [];
  const push = (rows: ReminderRow[], reminder: ReminderKind, dateOf: (row: ReminderRow) => string) => {
    for (const row of rows) {
      const customer = first(row.customer);
      if (!customer?.phone) continue;
      const vehicle = first(row.vehicle);
      const vehicleLabel = vehicle ? `${vehicle.display_name || vehicle.registration_number} · ${vehicle.registration_number}` : null;
      const templateId = templateForEvent({ kind: "reminder", reminder, onDate: "" });
      candidates.push({
        bookingId: row.id,
        reminder,
        onDate: dateOf(row),
        customerName: customer.full_name,
        phone: customer.phone,
        startAt: row.start_at,
        endAt: row.end_at,
        vehicleLabel,
        body: templateId
          ? composeMessage(templateId, {
              customerName: customer.full_name,
              vehicleLabel,
              startAt: row.start_at,
              endAt: row.end_at,
            }).body
          : "",
      });
    }
  };

  push((pickups.data || []) as ReminderRow[], "pickup", (row) => istDate(new Date(row.start_at)));
  push((returns.data || []) as ReminderRow[], "return_due", (row) => istDate(new Date(row.end_at)));
  // Overdue is keyed to today, so it can be chased again on a later day.
  push((overdue.data || []) as ReminderRow[], "overdue", () => istDate(now));

  if (!candidates.length) return [];

  const existing = await admin
    .from("booking_messages")
    .select("booking_id,event_key")
    .in("booking_id", [...new Set(candidates.map((item) => item.bookingId))]);
  if (existing.error) {
    if (isMissingSchema(existing.error)) return [];
    throw existing.error;
  }
  const handled = new Set((existing.data || []).map((row) => `${row.booking_id}|${row.event_key}`));

  return candidates.filter((candidate) => !handled.has(
    `${candidate.bookingId}|${eventKey({ kind: "reminder", reminder: candidate.reminder, onDate: candidate.onDate })}`,
  ));
}
