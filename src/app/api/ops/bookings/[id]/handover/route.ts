import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveHandover, getBookingDetail } from '@/lib/admin/bookings';
import { bookingDetail } from '@/lib/ops/serialize';
import { handoverSchema } from '@/lib/ops/schemas';
import { body, routeId, ok, json, missing, type IdContext } from '@/lib/ops/http';
export const GET = withAdmin<IdContext>(async (_r,_a,c) => { const d = await getBookingDetail(await routeId(c)); if (!d) return missing('Booking'); const detail = bookingDetail(d); return json({ handovers:detail.handovers, previousOdometerKm:detail.previousOdometerKm }); });
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const v = await body(r,handoverSchema); const result = await saveHandover({ bookingId:await routeId(c),...v }); return ok({ handoverId:result.handoverId,queuedMessage:result.messageId }); });
