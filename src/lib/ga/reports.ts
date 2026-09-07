import "server-only";
import { unstable_cache } from "next/cache";
import { verifyAdmin } from "@/lib/admin/auth";
import { batchRunReports, isGaConfigured, runRealtimeReport } from "./client";
import { buildRequests, mapBatchResponse, type TrafficData } from "./map";

export { RANGE_OPTIONS, normaliseRange } from "./map";
export type { RankItem, TrafficData, TrafficTotals } from "./map";

export type TrafficResult = { status: "ok"; days: number; data: TrafficData } | { status: "unconfigured" } | { status: "error"; message: string };

const fetchTraffic = unstable_cache(
  async (days: number) => mapBatchResponse(await batchRunReports(buildRequests(days))),
  ["ga4-traffic-report"],
  { revalidate: 900 },
);

const fetchRealtimeUsers = unstable_cache(
  async () => Number((await runRealtimeReport({ metrics: [{ name: "activeUsers" }] })).rows?.[0]?.metricValues?.[0]?.value) || 0,
  ["ga4-realtime-users"],
  { revalidate: 60 },
);

function toMessage(error: unknown) { return error instanceof Error ? error.message : "Unexpected Google Analytics error"; }

export async function getTrafficReport(days = 28): Promise<TrafficResult> {
  await verifyAdmin();
  if (!isGaConfigured()) return { status: "unconfigured" };
  try {
    return { status: "ok", days, data: await fetchTraffic(days) };
  } catch (error) {
    console.error("GA4 traffic report failed", error);
    return { status: "error", message: toMessage(error) };
  }
}

export async function getRealtimeUsers(): Promise<number | null> {
  await verifyAdmin();
  if (!isGaConfigured()) return null;
  try {
    return await fetchRealtimeUsers();
  } catch (error) {
    console.error("GA4 realtime report failed", error);
    return null;
  }
}
