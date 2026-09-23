import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { isMissingSchema } from "@/lib/admin/schema";
import { sendApns, type ApnsEnvironment, type ApnsResult } from "./apns";
import { groupByEnvironment } from "./apns-payload";

export type NotificationKind = "request" | "unsent" | "overdue" | "pickups";

export type NotifyInput = {
  /** Stable identity for what happened; the DB unique constraint dedups on it. */
  dedupeKey: string;
  kind: NotificationKind;
  title: string;
  body: string;
  bookingId?: string;
};

type Device = { id: string; apns_token: string; environment: ApnsEnvironment };

/** Bookings still waiting for a decision — what the app icon badge shows. */
export async function pendingRequestCount() {
  const { count, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "requested");
  if (error) {
    if (isMissingSchema(error)) return 0;
    throw error;
  }
  return count || 0;
}

/** The widget's numbers, also embedded in every push so it can refresh itself. */
export async function opsSummary() {
  const admin = getSupabaseAdmin();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const staleBefore = new Date(now.getTime() - 30 * 60_000).toISOString();

  const [requests, overdue, pickups, unsent] = await Promise.all([
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "requested"),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "ongoing").lt("end_at", now.toISOString()),
    admin.from("bookings").select("id", { count: "exact", head: true }).in("status", ["approved", "confirmed"]).gte("start_at", now.toISOString()).lte("start_at", endOfDay.toISOString()),
    admin.from("booking_messages").select("id", { count: "exact", head: true }).eq("status", "due").lt("created_at", staleBefore),
  ]);

  return {
    pendingRequests: requests.error ? 0 : requests.count || 0,
    overdueReturns: overdue.error ? 0 : overdue.count || 0,
    pickupsToday: pickups.error ? 0 : pickups.count || 0,
    unsentMessages: unsent.error ? 0 : unsent.count || 0,
  };
}

async function listDevices(): Promise<Device[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_devices")
    .select("id,apns_token,environment");
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data || []) as Device[];
}

/**
 * Notifies every registered phone about something, exactly once.
 *
 * The dedup is decided by the database: the log row is inserted with
 * `on conflict do nothing`, and the push only goes out if this call was the one
 * that won the insert. Two overlapping cron runs therefore cannot both send,
 * which application-level checks would not guarantee.
 */
export async function notifyAdmins(input: NotifyInput) {
  const admin = getSupabaseAdmin();

  const claimed = await admin
    .from("admin_notifications")
    .upsert(
      {
        dedupe_key: input.dedupeKey,
        kind: input.kind,
        booking_id: input.bookingId ?? null,
        title: input.title,
        body: input.body,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (claimed.error) {
    if (isMissingSchema(claimed.error)) return { sent: 0, skipped: true };
    throw claimed.error;
  }
  // Someone already reported this; nothing to do.
  if (!claimed.data?.id) return { sent: 0, skipped: true };

  const devices = await listDevices();
  if (!devices.length) return { sent: 0, skipped: false };

  const [badge, summary] = await Promise.all([pendingRequestCount(), opsSummary()]);
  const payload = {
    title: input.title,
    body: input.body,
    badge,
    bookingId: input.bookingId,
    threadId: input.kind,
    collapseId: input.dedupeKey,
    summary,
  };
  // One send per APNs host. A token from a debug build is only valid against
  // sandbox and one from TestFlight only against production, so sending the
  // whole list to a single host would fail half of them with BadDeviceToken —
  // and the pruning below would then delete those phones as dead.
  const results = (
    await Promise.all(
      groupByEnvironment(devices).map(([environment, tokens]) => sendApns(tokens, payload, environment)),
    )
  ).flat();

  // A plain `!result.ok` filter does not narrow the union, so predicate it.
  const failures = results.filter((result): result is Extract<ApnsResult, { ok: false }> => !result.ok);
  const expired = failures.filter((failure) => failure.expired).map((failure) => failure.token);
  if (expired.length) {
    // A deleted app or reinstalled phone invalidates its token permanently.
    await admin.from("admin_devices").delete().in("apns_token", expired);
  }
  const failed = failures.filter((failure) => !failure.expired);
  for (const failure of failed) {
    const device = devices.find((item) => item.apns_token === failure.token);
    if (device) {
      await admin.from("admin_devices")
        .update({ failure_count: (await currentFailures(device.id)) + 1 })
        .eq("id", device.id);
    }
    console.error("APNs send failed", { status: failure.status, reason: failure.reason });
  }

  const sent = results.filter((result) => result.ok).length;
  await admin.from("admin_notifications")
    .update({ sent_at: new Date().toISOString(), badge, device_count: sent })
    .eq("id", claimed.data.id);

  return { sent, skipped: false };
}

async function currentFailures(deviceId: string) {
  const { data } = await getSupabaseAdmin().from("admin_devices").select("failure_count").eq("id", deviceId).maybeSingle();
  return Number(data?.failure_count || 0);
}
