// Multipart <= 4 MB. Larger PDFs use the web panel; storage.createSignedUploadUrl
// is the escape hatch if large native document uploads become necessary.
import { withAdmin } from '@/lib/ops/auth';
import { storeVehicleFile } from '@/lib/admin/fleet-media';
import { documentSchema } from '@/lib/ops/schemas';
import { multipart,routeId,ok,type IdContext } from '@/lib/ops/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = withAdmin<IdContext>(async (r,_a,c) => {
  const vehicleId = await routeId(c), { form,file } = await multipart(r);
  return ok({ documentId:await storeVehicleFile(vehicleId,file,documentSchema.parse(Object.fromEntries(form))) });
});
