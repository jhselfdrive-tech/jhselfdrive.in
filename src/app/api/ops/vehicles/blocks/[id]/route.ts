import { withAdmin } from '@/lib/ops/auth';
import { updateVehicleBlock, deleteVehicleBlock } from '@/lib/admin/fleet';
import { blockPatchSchema } from '@/lib/ops/schemas';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const PATCH = withAdmin<IdContext>(async (r,_a,c) => { await updateVehicleBlock(await routeId(c),await body(r,blockPatchSchema)); return ok(); });
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await deleteVehicleBlock(await routeId(c)); return ok(); });
