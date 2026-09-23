import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { assignVehicleToBooking } from '@/lib/admin/fleet';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (request,_admin,context) => { const id = await routeId(context); const v = await body(request,z.object({ vehicleId: z.uuid() })); await assignVehicleToBooking(id,v.vehicleId); return ok(); });
