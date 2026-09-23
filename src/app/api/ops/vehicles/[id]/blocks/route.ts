import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { addVehicleBlock } from '@/lib/admin/fleet';
import { rangeSchema } from '@/lib/ops/schemas';
import { body,routeId,ok,type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const v = await body(r,rangeSchema.safeExtend({ reason:z.string().trim().min(3).max(300) })); await addVehicleBlock({ vehicleId:await routeId(c),...v }); return ok(); });
