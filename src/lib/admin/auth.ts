import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/** Thrown instead of redirecting when the caller is an API client. */
export class AdminAuthError extends Error {
  constructor(readonly status: 401 | 403 | 500, message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function isAllowedAdmin(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id,email,full_name")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

function profile(id: string, email: string, fullName: string | null) {
  return { id, email: email.toLowerCase(), fullName: fullName || email.split("@")[0] };
}

/**
 * Bearer-token path, used by the /api/ops routes the iOS app calls. Throws
 * rather than redirecting, because an API client has nowhere to be sent.
 */
async function verifyBearer(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new AdminAuthError(500, "Supabase is not configured");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) throw new AdminAuthError(401, "Invalid or expired token");

  const allowed = await isAllowedAdmin(data.user.email);
  if (!allowed) throw new AdminAuthError(403, "Not an administrator");
  return profile(data.user.id, data.user.email, allowed.full_name);
}

/**
 * The single definition of "is an authorised admin", for both the browser
 * panel and the iOS app.
 *
 * Every function in src/lib/admin calls this, so it has to serve both callers:
 * a browser request carries Supabase auth cookies, while the ops API carries an
 * Authorization: Bearer header and no cookies at all. Without the bearer branch
 * the cookie path finds no session and redirects, which surfaces to an API
 * client as an opaque 500.
 */
export const verifyAdmin = cache(async () => {
  const authorization = (await headers()).get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return verifyBearer(authorization.slice(7).trim());
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) redirect("/admin/login");

  const allowed = await isAllowedAdmin(user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }
  return profile(user.id, user.email, allowed.full_name);
});
