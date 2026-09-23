import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { deleteBookingMedia } from '@/lib/admin/bookings';
import { routeId, ok, type IdContext } from '@/lib/ops/http';
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await deleteBookingMedia(await routeId(c)); return ok(); });
