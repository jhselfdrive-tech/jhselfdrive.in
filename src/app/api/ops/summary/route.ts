import { withAdmin } from "@/lib/ops/auth";
import { opsSummary } from "@/lib/push/notify";

// node:http2 and the service-role client both need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The widget's data source: four counts, deliberately small and cheap. */
export const GET = withAdmin(async () => Response.json(await opsSummary(), {
  headers: { "cache-control": "no-store" },
}));
