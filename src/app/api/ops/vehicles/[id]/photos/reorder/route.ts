import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { reorderVehiclePhotos } from '@/lib/admin/fleet';
import { body,routeId,ok,type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const v = await body(r,z.object({ orderedIds:z.array(z.uuid()).max(100).refine(ids => new Set(ids).size === ids.length,'Duplicate photo') })); await reorderVehiclePhotos(await routeId(c),v.orderedIds); return ok(); });
