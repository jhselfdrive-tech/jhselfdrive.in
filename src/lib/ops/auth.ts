import "server-only";
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
      return await handler(request, admin, context);
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      // A redirect escaping to here means some path still tried to send a
      // browser to the login page. Report it as auth rather than as a generic
      // failure, which is impossible to diagnose from the app.
      if (isRedirect(error)) {
        return Response.json({ error: "Not signed in as an administrator" }, { status: 401 });
      }
      console.error("Ops API failed", error);
      return Response.json({ error: "Request failed" }, { status: 500 });
    }
  };
}

/** The scheduler authenticates with a shared secret, not an admin session. */
export function verifyCronSecret(request: Request) {
  const expected = process.env.OPS_CRON_SECRET;
  if (!expected) throw new AdminAuthError(500, "OPS_CRON_SECRET is not set");
  if (request.headers.get("x-ops-cron-secret") !== expected) throw new AdminAuthError(401, "Bad cron secret");
}
