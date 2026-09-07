import Link from "next/link";
import { Suspense } from "react";
import { Activity, ArrowUpRight, CalendarClock, IndianRupee, Inbox, TrendingUp } from "lucide-react";
import { AlertsPanel } from "@/components/admin/AlertsPanel";
import { GaTrafficStrip, GaTrafficStripSkeleton } from "@/components/admin/GaTrafficStrip";
import { MetricCard } from "@/components/admin/MetricCard";
import { RankList } from "@/components/admin/RankList";
import { TrendChart } from "@/components/admin/TrendChart";
import { site } from "@/content/site";
import { getDashboardMetrics } from "@/lib/admin/data";
import { getFleetAlerts } from "@/lib/admin/fleet";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, alerts] = await Promise.all([getDashboardMetrics(), getFleetAlerts()]);
  const funnelMax = Math.max(...metrics.funnel.map((item) => item.value), 1);
  const topCars = metrics.topCars.map((item) => ({ label: site.fleet.find((car) => car.slug === item.slug)?.name || item.slug, value: item.value }));

  return <>
    <div className="admin-page-head"><div><span className="admin-overline">Live business pulse</span><h1>Good decisions start here.</h1><p>Demand, conversion, fleet risk and revenue at a glance.</p></div><div className="admin-head-actions"><Link className="admin-secondary-button" href="/admin/enquiries">Open inbox <ArrowUpRight size={14} /></Link></div></div>
    <AlertsPanel alerts={alerts} />
    <section className="admin-metrics">
      <MetricCard label="Enquiries this week" value={String(metrics.thisWeek)} detail={<span className={metrics.weekChange >= 0 ? "admin-positive" : "admin-negative"}>{metrics.weekChange >= 0 ? "+" : ""}{metrics.weekChange}% vs last week</span>} icon={Inbox} color="#dce9ff" ink="#3a6ba7" />
      <MetricCard label="Conversion rate" value={`${metrics.conversionRate}%`} detail="Completed bookings / enquiries" icon={TrendingUp} color="#e0f1e8" />
      <MetricCard label="Revenue this month" value={`₹${metrics.revenueThisMonth.toLocaleString("en-IN")}`} detail="From completed bookings" icon={IndianRupee} color="#ffeadc" ink="#b95735" />
      <MetricCard label="Active bookings" value={String(metrics.activeBookings)} detail="Confirmed or on the road" icon={CalendarClock} color="#eee5ff" ink="#734ca1" />
    </section>
    <Suspense fallback={<GaTrafficStripSkeleton />}><GaTrafficStrip days={7} /></Suspense>
    <section className="admin-dashboard-grid">
      <article className="admin-card"><div className="admin-card-head"><div><h2>Enquiry trend</h2><span className="admin-card-subtitle">Weekly demand over the last 8 weeks</span></div><Activity size={18} color="var(--teal)" /></div><TrendChart data={metrics.trend} /></article>
      <article className="admin-card"><div className="admin-card-head"><div><h2>Conversion funnel</h2><span className="admin-card-subtitle">Where potential customers drop off</span></div></div><div className="admin-funnel">{metrics.funnel.map((item, index) => { const previous = index ? metrics.funnel[index - 1].value : item.value; const drop = previous ? Math.max(0, Math.round((1 - item.value / previous) * 100)) : 0; return <div className="admin-funnel-row" key={item.label}><span>{item.label}{index > 0 ? <small className="admin-table-detail">{drop}% drop</small> : null}</span><div className="admin-funnel-track"><div className="admin-funnel-fill" style={{ width: `${Math.max(2, (item.value / funnelMax) * 100)}%` }} /></div><strong className="admin-funnel-value">{item.value}</strong></div>; })}</div></article>
      <article className="admin-card"><div className="admin-card-head"><div><h2>Top requested cars</h2><span className="admin-card-subtitle">What customers want most</span></div></div><RankList items={topCars} emptyText="No car requests yet." /></article>
      <article className="admin-card"><div className="admin-card-head"><div><h2>Revenue by vehicle</h2><span className="admin-card-subtitle">Which physical cars earn the most</span></div><Link className="admin-card-link" href="/admin/fleet">Fleet details <ArrowUpRight size={13} /></Link></div><RankList items={metrics.vehicleRevenue} emptyText="Assign vehicles to completed bookings to compare revenue." accent="linear-gradient(90deg,#7357a6,#b78be2)" /></article>
      <article className="admin-card"><div className="admin-card-head"><div><h2>Traffic sources</h2><span className="admin-card-subtitle">Where enquiries originate</span></div><Link className="admin-card-link" href="/admin/traffic">All traffic <ArrowUpRight size={13} /></Link></div><RankList items={metrics.sources} emptyText="Source data will appear with enquiries." accent="linear-gradient(90deg,#ed684d,#ffc162)" capitalize /></article>
    </section>
  </>;
}
