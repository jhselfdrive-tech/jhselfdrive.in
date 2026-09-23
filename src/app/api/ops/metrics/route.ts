import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { getDashboardMetrics } from '@/lib/admin/data';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async r => { const v = z.object({ days:z.coerce.number().int().min(7).max(365).default(56) }).parse(Object.fromEntries(new URL(r.url).searchParams)); const { thisWeek,lastWeek,weekChange,conversionRate,revenueThisMonth,activeBookings,pendingBookings,trend,vehicleRevenue } = await getDashboardMetrics(v.days); return json({ thisWeek,lastWeek,weekChange,conversionRate,revenueThisMonth,activeBookings,pendingBookings,trend,vehicleRevenue }); });
