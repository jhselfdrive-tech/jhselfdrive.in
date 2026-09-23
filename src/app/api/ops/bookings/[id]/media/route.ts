import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { storeBookingMedia } from '@/lib/admin/media';
import { mediaSchema } from '@/lib/ops/schemas';
import { multipart, routeId, ok, type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const bookingId = await routeId(c); const { form,file } = await multipart(r,3_500_000); const input = mediaSchema.parse(Object.fromEntries(form)); return ok({ mediaId:await storeBookingMedia({ bookingId,...input,file }) }); });
