import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { deleteVehiclePhoto } from '@/lib/admin/fleet';
import { routeId, ok, type IdContext } from '@/lib/ops/http';
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await deleteVehiclePhoto(await routeId(c)); return ok(); });
