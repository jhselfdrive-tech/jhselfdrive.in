import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { deletePayment, updatePayment } from '@/lib/admin/payments';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await deletePayment(await routeId(c)); return ok(); });

import { paymentPatchSchema } from '@/lib/ops/schemas';
export const PATCH = withAdmin<IdContext>(async (r,_a,c) => { await updatePayment(await routeId(c),await body(r,paymentPatchSchema)); return ok(); });
