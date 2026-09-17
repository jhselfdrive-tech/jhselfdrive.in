import { z } from "zod";
import { withAdmin } from "@/lib/ops/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  // APNs tokens are hex; the DB enforces the same shape.
  apnsToken: z.string().trim().regex(/^[0-9a-fA-F]{64,200}$/, "Invalid device token"),
  environment: z.enum(["sandbox", "production"]).optional().default("production"),
  appVersion: z.string().trim().max(40).optional().default(""),
});

export const POST = withAdmin(async (request, admin) => {
  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Invalid device" }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin().from("admin_devices").upsert({
    admin_email: admin.email,
    apns_token: parsed.data.apnsToken,
    environment: parsed.data.environment,
    app_version: parsed.data.appVersion || null,
    failure_count: 0,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "apns_token" });
  if (error) {
    console.error("Device registration failed", error);
    return Response.json({ error: "Could not register this device" }, { status: 500 });
  }
  return Response.json({ ok: true });
});

const removeSchema = z.object({ apnsToken: z.string().trim().min(64) });

/** Called on sign-out so a shared phone stops receiving another admin's pushes. */
export const DELETE = withAdmin(async (request) => {
  const parsed = removeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid device" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("admin_devices").delete().eq("apns_token", parsed.data.apnsToken);
  if (error) return Response.json({ error: "Could not remove this device" }, { status: 500 });
  return Response.json({ ok: true });
});
