import "server-only";
import { ZodError } from "zod";
import { opsError } from "./errors";
import { AdminAuthError, verifyAdmin } from "@/lib/admin/auth";

export type OpsAdmin = { id: string; email: string; fullName: string };

/** Next's redirect() throws an object carrying this key. */
function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error
    && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/**
 * Wraps a route handler with admin auth, forwarding Next's route context so
 * handlers read `params` properly instead of picking segments out of the URL.
 *
 * Auth itself is delegated to verifyAdmin(), which understands both cookies and
 * bearer tokens — so the ops API and the web panel cannot drift apart on who
 * counts as an admin.
 */
export function withAdmin<Ctx = unknown>(
  handler: (request: Request, admin: OpsAdmin, context: Ctx) => Promise<Response>,
) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      const admin = await verifyAdmin();
      const response = await handler(request, admin, context);
      response.headers.set("cache-control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return Response.json({ error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
      }
      // A redirect escaping to here means some path still tried to send a
      // browser to the login page. Report it as auth rather than as a generic
      // failure, which is impossible to diagnose from the app.
      if (isRedirect(error)) {
        return Response.json({ error: "Not signed in as an administrator" }, { status: 401, headers: { "cache-control": "no-store" } });
      }
      if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || "Invalid request", code: "INVALID_REQUEST" }, { status: 400, headers: { "cache-control": "no-store" } });
      if (error instanceof Error && "status" in error && (error.status === 400 || error.status === 413)) {
        return Response.json({ error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
      }
      const failure = opsError(error);
      if (failure.status === 500) console.error("Ops API failed", error);
      return Response.json({ error: failure.message, code: failure.code }, { status: failure.status, headers: { "cache-control": "no-store" } });
    }
  };
}

/** The scheduler authenticates with a shared secret, not an admin session. */
export function verifyCronSecret(request: Request) {
  const expected = process.env.OPS_CRON_SECRET;
  if (!expected) throw new AdminAuthError(500, "OPS_CRON_SECRET is not set");
  if (request.headers.get("x-ops-cron-secret") !== expected) throw new AdminAuthError(401, "Bad cron secret");
}
