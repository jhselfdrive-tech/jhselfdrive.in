import { withAdmin } from '@/lib/ops/auth';
import { updateVehicleDocument, deleteVehicleDocument } from '@/lib/admin/fleet';
import { documentPatchSchema } from '@/lib/ops/schemas';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const PATCH = withAdmin<IdContext>(async (r,_a,c) => { await updateVehicleDocument(await routeId(c),await body(r,documentPatchSchema)); return ok(); });
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await deleteVehicleDocument(await routeId(c)); return ok(); });
