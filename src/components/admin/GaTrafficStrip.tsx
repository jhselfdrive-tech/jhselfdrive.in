import { Gauge, MousePointerClick, Radio, Users } from "lucide-react";
import { getRealtimeUsers, getTrafficReport } from "@/lib/ga/reports";
import { MetricCard } from "./MetricCard";
import { GaNotice } from "./GaNotice";

function Delta({ value, days }: { value: number; days: number }) {
  return <span className={value >= 0 ? "admin-positive" : "admin-negative"}>{value >= 0 ? "+" : ""}{value}% vs previous {days} days</span>;
}

export async function GaTrafficStrip({ days = 7 }: { days?: number }) {
  const [report, live] = await Promise.all([getTrafficReport(days), getRealtimeUsers()]);
  if (report.status !== "ok") return <GaNotice result={report} />;
  const { totals, deltas } = report.data;
  const minutes = Math.floor(totals.avgEngagementSeconds / 60);
  return <section className="admin-metrics"><MetricCard label={`Website visitors (${days}d)`} value={totals.visitors.toLocaleString("en-IN")} detail={<Delta value={deltas.visitors} days={days} />} icon={Users} color="#dcefe9" /><MetricCard label="Sessions" value={totals.sessions.toLocaleString("en-IN")} detail={<Delta value={deltas.sessions} days={days} />} icon={MousePointerClick} color="#dce9ff" ink="#3a6ba7" /><MetricCard label="Engagement rate" value={`${totals.engagementRate}%`} detail={<Delta value={deltas.engagementRate} days={days} />} icon={Gauge} color="#eee5ff" ink="#734ca1" /><MetricCard label="Live right now" value={live === null ? "—" : String(live)} detail={live === null ? "Realtime unavailable" : `Avg visit ${minutes ? `${minutes}m ` : ""}${totals.avgEngagementSeconds % 60}s`} icon={Radio} color="#ffeadc" ink="#b95735" /></section>;
}

export function GaTrafficStripSkeleton() {
  return <section className="admin-metrics">{[0, 1, 2, 3].map((index) => <article className="admin-metric admin-metric-loading" key={index}><span className="admin-metric-label">Loading Google Analytics…</span><strong className="admin-metric-value">—</strong></article>)}</section>;
}
