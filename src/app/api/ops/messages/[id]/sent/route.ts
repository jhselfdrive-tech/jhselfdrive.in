import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { markMessageSent } from '@/lib/admin/messages';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const id = await routeId(c); const v = await body(r,z.object({ reason:z.string().trim().max(300).default('') })); await markMessageSent(id); void v; return ok(); });
