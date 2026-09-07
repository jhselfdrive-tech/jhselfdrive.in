import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { CalendarGrid } from "@/components/admin/CalendarGrid";
import { getCalendarData } from "@/lib/admin/fleet";

export const dynamic = "force-dynamic";

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftDate(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00+05:30`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const requested = typeof raw.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.start) ? raw.start : todayInIndia();
  const startAt = `${requested}T00:00:00+05:30`;
  const endAt = new Date(new Date(startAt).getTime() + 30 * 86_400_000).toISOString();
  const data = await getCalendarData(startAt, endAt);
  return <>
    <div className="admin-page-head"><div><span className="admin-overline">Live allocation</span><h1>Fleet calendar</h1><p>Exact booking and maintenance windows. Adjacent handovers do not overlap.</p></div><div className="admin-head-actions"><Link className="admin-secondary-button" href={`/admin/calendar?start=${shiftDate(requested, -14)}`}><ArrowLeft size={14} /> Earlier</Link><Link className="admin-secondary-button" href="/admin/calendar"><CalendarDays size={14} /> Today</Link><Link className="admin-secondary-button" href={`/admin/calendar?start=${shiftDate(requested, 14)}`}>Later <ArrowRight size={14} /></Link></div></div>
    <section className="admin-card admin-calendar-card"><div className="admin-card-head"><div><h2>{new Date(startAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" })} onwards</h2><span className="admin-card-subtitle">30 days on desktop · 14 days on mobile</span></div></div><CalendarGrid vehicles={data.vehicles} bookings={data.bookings} blocks={data.blocks} startAt={startAt} /></section>
  </>;
}
