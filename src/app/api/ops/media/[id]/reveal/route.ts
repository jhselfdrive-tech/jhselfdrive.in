import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { revealLicenceMedia } from '@/lib/admin/bookings';
import { routeId, json, type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (_r,_a,c) => json({ url:await revealLicenceMedia(await routeId(c)), expiresIn:60 }));
