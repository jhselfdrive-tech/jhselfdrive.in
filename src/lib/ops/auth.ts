import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isAllowedAdmin } from "@/lib/admin/auth";

export type OpsAdmin = { id: string; email: string; fullName: string };

export class OpsAuthError extends Error {
  constructor(readonly status: 401 | 403 | 500, message: string) {
    super(message);
  }
}

/**
 * Authorises an API call from the iOS app.
 *
 * Mirrors verifyAdmin() in src/lib/admin/auth.ts but answers with a status
 * instead of a redirect, since there is no browser to redirect. Crucially it
 * reuses the same `admin_users` allowlist — a valid Supabase account is not on
 * its own enough to reach the ops API.
 */
export async function verifyAdminToken(request: Request): Promise<OpsAdmin> {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new OpsAuthError(401, "Missing bearer token");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new OpsAuthError(500, "Supabase is not configured");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) throw new OpsAuthError(401, "Invalid or expired token");

  const allowed = await isAllowedAdmin(data.user.email);
  if (!allowed) throw new OpsAuthError(403, "Not an administrator");

  return {
    id: data.user.id,
    email: data.user.email.toLowerCase(),
    fullName: allowed.full_name || data.user.email.split("@")[0],
  };
}

/**
 * Wraps a route handler so auth failures become clean JSON rather than a 500,
 * forwarding Next's route context so handlers read `params` properly instead
 * of picking segments out of the URL.
 */
export function withAdmin<Ctx = unknown>(
  handler: (request: Request, admin: OpsAdmin, context: Ctx) => Promise<Response>,
) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      const admin = await verifyAdminToken(request);
      return await handler(request, admin, context);
    } catch (error) {
      if (error instanceof OpsAuthError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      console.error("Ops API failed", error);
      return Response.json({ error: "Request failed" }, { status: 500 });
    }
  };
}

/** The scheduler authenticates with a shared secret, not an admin session. */
export function verifyCronSecret(request: Request) {
  const expected = process.env.OPS_CRON_SECRET;
  if (!expected) throw new OpsAuthError(500, "OPS_CRON_SECRET is not set");
  if (request.headers.get("x-ops-cron-secret") !== expected) throw new OpsAuthError(401, "Bad cron secret");
}
