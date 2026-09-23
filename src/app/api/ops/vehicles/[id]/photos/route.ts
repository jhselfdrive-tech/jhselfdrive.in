import { withAdmin } from '@/lib/ops/auth';
import { storeVehicleFile } from '@/lib/admin/fleet-media';
import { multipart,routeId,ok,type IdContext } from '@/lib/ops/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = withAdmin<IdContext>(async (r,_a,c) => {
  const vehicleId = await routeId(c), { file } = await multipart(r,3_500_000);
  return ok({ photoId:await storeVehicleFile(vehicleId,file) });
});
