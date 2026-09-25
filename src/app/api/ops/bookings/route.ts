import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { listBookings, createAdminBooking } from '@/lib/admin/data';
import { bookingRow } from '@/lib/ops/serialize';
import { bookingSchema, timestamp } from '@/lib/ops/schemas';
import { body, json, ok } from '@/lib/ops/http';
import { BOOKING_STATUSES } from '@/lib/bookings/status';
const querySchema = z.object({ status: z.enum([...BOOKING_STATUSES, 'all', 'active', 'upcoming', 'overdue', 'messages', 'pickups']).default('all'), search: z.string().max(100).optional(), limit: z.coerce.number().int().min(1).max(250).default(50), from: timestamp.optional(), to: timestamp.optional(), cursor: z.string().max(300).optional() });
const cursorSchema = z.object({ startAt: timestamp, id: z.uuid() });
export const GET = withAdmin(async request => {
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const cursor = query.cursor ? cursorSchema.parse(decodeCursor(query.cursor)) : undefined;
  const rows = await listBookings({ ...query, cursor, limit: query.limit + 1 });
  const page = rows.slice(0, query.limit), last = page.at(-1);
  return json({ bookings: page.map(bookingRow), nextCursor: rows.length > query.limit && last ? Buffer.from(JSON.stringify({ startAt: last.start_at, id: last.id })).toString('base64url') : null });
});
export const POST = withAdmin(async request => ok(await createAdminBooking(await body(request, bookingSchema))));

function decodeCursor(value: string): unknown {
  try { return JSON.parse(Buffer.from(value,'base64url').toString('utf8')); }
  catch { return null; }
}
