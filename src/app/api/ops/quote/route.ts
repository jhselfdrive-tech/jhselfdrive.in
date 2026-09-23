import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { quoteBooking } from '@/lib/admin/data';
import { quoteSchema } from '@/lib/ops/schemas';
import { body, json } from '@/lib/ops/http';
export const POST = withAdmin(async request => { const v = await body(request, quoteSchema); return json(await quoteBooking(v.vehicleId, v.startAt, v.endAt)); });
