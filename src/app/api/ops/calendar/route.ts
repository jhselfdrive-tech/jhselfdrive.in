import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { getCalendarData } from '@/lib/admin/fleet';
import { packCalendarLanes } from '@/lib/ops/calendar';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async r => { const v = z.object({ start:z.iso.date(),days:z.coerce.number().int().min(1).max(90).default(14) }).parse(Object.fromEntries(new URL(r.url).searchParams)); const start = new Date(`${v.start}T00:00:00+05:30`); const end = new Date(start.getTime()+v.days*86400000); const d = await getCalendarData(start.toISOString(),end.toISOString()); return json({ start:v.start,days:v.days,lanes:packCalendarLanes(d.vehicles,d.bookings,d.blocks,v.start,v.days) }); });
