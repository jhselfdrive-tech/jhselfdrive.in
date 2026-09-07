import Link from "next/link";
import { Suspense } from "react";
import { FileText, MapPin, Smartphone, TrendingUp } from "lucide-react";
import { getTrafficReport, normaliseRange, RANGE_OPTIONS } from "@/lib/ga/reports";
import { GaNotice } from "@/components/admin/GaNotice";
import { GaTrafficStrip, GaTrafficStripSkeleton } from "@/components/admin/GaTrafficStrip";
import { AreaChart } from "@/components/admin/AreaChart";
import { RankList } from "@/components/admin/RankList";

export const dynamic = "force-dynamic";

async function TrafficBreakdown({ days }: { days: number }) {
  const report = await getTrafficReport(days);
  if (report.status !== "ok") return <GaNotice result={report} />;
  const { trend, devices, cities, landingPages } = report.data;
  return <><article className="admin-card" style={{ marginTop: 14 }}><div className="admin-card-head"><div><h2>Visitors</h2><span className="admin-card-subtitle">Daily active users over the last {days} days</span></div><TrendingUp size={18} color="var(--teal)" /></div><AreaChart data={trend} label={`Daily visitors over the last ${days} days`} /></article><section className="admin-dashboard-grid admin-grid-3"><article className="admin-card"><div className="admin-card-head"><div><h2>Devices</h2><span className="admin-card-subtitle">How people browse the site</span></div><Smartphone size={18} color="var(--teal)" /></div><RankList items={devices} emptyText="No device data yet." capitalize /></article><article className="admin-card"><div className="admin-card-head"><div><h2>Top cities</h2><span className="admin-card-subtitle">Where the demand comes from</span></div><MapPin size={18} color="var(--teal)" /></div><RankList items={cities} emptyText="No location data yet." /></article><article className="admin-card"><div className="admin-card-head"><div><h2>Landing pages</h2><span className="admin-card-subtitle">Entry points by session</span></div><FileText size={18} color="var(--teal)" /></div><RankList items={landingPages} emptyText="No landing page data yet." accent="linear-gradient(90deg,#ed684d,#ffc162)" /></article></section></>;
}

export default async function TrafficPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const days = normaliseRange(raw.range);
  return <><div className="admin-page-head"><div><span className="admin-overline">Google Analytics</span><h1>Who is visiting.</h1><p>Audience, devices and entry points, straight from GA4.</p></div><div className="admin-range-pills">{RANGE_OPTIONS.map((option) => <Link className={option === days ? "is-active" : undefined} href={`/admin/traffic?range=${option}`} key={option}>{option}d</Link>)}</div></div><Suspense fallback={<GaTrafficStripSkeleton />} key={`strip-${days}`}><GaTrafficStrip days={days} /></Suspense><Suspense fallback={<div className="admin-card" style={{ marginTop: 14 }}><div className="admin-empty">Loading Google Analytics…</div></div>} key={`breakdown-${days}`}><TrafficBreakdown days={days} /></Suspense></>;
}
