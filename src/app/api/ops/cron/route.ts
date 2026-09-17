import { OpsAuthError, verifyCronSecret } from "@/lib/ops/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { isMissingSchema } from "@/lib/admin/schema";
import { notifyAdmins } from "@/lib/push/notify";
import { formatInr, formatIstDateTime } from "@/lib/messages/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const istDate = (value: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

type Row = {
  id: string; start_at: string; end_at: string; amount_total: string | number;
  customer: { full_name: string | null; phone: string } | { full_name: string | null; phone: string }[] | null;
  vehicle: { registration_number: string; display_name: string | null } | { registration_number: string; display_name: string | null }[] | null;
};

const first = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] || null : value);
const nameOf = (row: Row) => first(row.customer)?.full_name || first(row.customer)?.phone || "A customer";
const carOf = (row: Row) => {
  const vehicle = first(row.vehicle);
  return vehicle ? vehicle.display_name || vehicle.registration_number : "the car";
};

/**
 * The scheduled half of the notifications, driven by Supabase pg_cron every
 * 30 minutes (see 0008_ops_push.sql). Authenticated with a shared secret
 * because there is no admin session behind it.
 *
 * Each check hands notifyAdmins a dedupe key, so running every 30 minutes does
 * not re-notify the same thing — the database decides what is new.
 */
export async function POST(request: Request) {
  try {
    verifyCronSecret(request);
  } catch (error) {
    const status = error instanceof OpsAuthError ? error.status : 500;
    return Response.json({ error: "Unauthorised" }, { status });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();
  const today = istDate(now);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const staleBefore = new Date(now.getTime() - 30 * 60_000).toISOString();
  const select = "id,start_at,end_at,amount_total,customer:customers(full_name,phone),vehicle:vehicles(registration_number,display_name)";
  const sent: string[] = [];

  try {
    // 1. Requests that have been waiting. The immediate push happens in the
    //    booking action; this is the safety net for one that failed to send.
    const stale = await admin.from("bookings").select(select).eq("status", "requested").lt("created_at", staleBefore).order("created_at").limit(5);
    for (const row of (stale.data || []) as Row[]) {
      const result = await notifyAdmins({
        dedupeKey: `request:${row.id}`,
        kind: "request",
        title: "Booking request waiting",
        body: `${nameOf(row)} · ${formatIstDateTime(row.start_at)} · ${formatInr(Number(row.amount_total))}`,
        bookingId: row.id,
      });
      if (!result.skipped) sent.push(`request:${row.id}`);
    }

    // 2. Overdue returns — keyed to the day so it can be chased again tomorrow.
    const overdue = await admin.from("bookings").select(select).eq("status", "ongoing").lt("end_at", now.toISOString()).order("end_at").limit(5);
    for (const row of (overdue.data || []) as Row[]) {
      const result = await notifyAdmins({
        dedupeKey: `overdue:${row.id}:${today}`,
        kind: "overdue",
        title: "Return overdue",
        body: `${carOf(row)} was due back ${formatIstDateTime(row.end_at)} — ${nameOf(row)}`,
        bookingId: row.id,
      });
      if (!result.skipped) sent.push(`overdue:${row.id}`);
    }

    // 3. Customer messages still unsent after half an hour.
    const unsent = await admin.from("booking_messages").select("id,booking_id,event_key").eq("status", "due").lt("created_at", staleBefore).order("created_at").limit(5);
    if (unsent.error && !isMissingSchema(unsent.error)) throw unsent.error;
    for (const row of unsent.data || []) {
      const result = await notifyAdmins({
        dedupeKey: `unsent:${row.id}`,
        kind: "unsent",
        title: "Customer still waiting",
        body: "A WhatsApp update has not been sent yet. Tap to open the booking.",
        bookingId: row.booking_id as string,
      });
      if (!result.skipped) sent.push(`unsent:${row.id}`);
    }

    // 4. One morning summary of today's handovers.
    const pickups = await admin.from("bookings").select(select).in("status", ["approved", "confirmed"]).gte("start_at", now.toISOString()).lte("start_at", endOfDay.toISOString()).order("start_at");
    const rows = (pickups.data || []) as Row[];
    if (rows.length) {
      const result = await notifyAdmins({
        dedupeKey: `pickups:${today}`,
        kind: "pickups",
        title: `${rows.length} pickup${rows.length === 1 ? "" : "s"} today`,
        body: rows.slice(0, 3).map((row) => `${nameOf(row)} ${formatIstDateTime(row.start_at).split(", ").pop()}`).join(" · "),
      });
      if (!result.skipped) sent.push(`pickups:${today}`);
    }
  } catch (error) {
    console.error("Ops cron failed", error);
    return Response.json({ error: "Cron run failed" }, { status: 500 });
  }

  return Response.json({ ok: true, sent });
}
