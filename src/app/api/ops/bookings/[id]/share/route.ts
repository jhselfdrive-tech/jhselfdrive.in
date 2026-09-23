import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { rotateBookingShareLink, revokeBookingShareLink } from '@/lib/admin/bookings';
import { timestamp } from '@/lib/ops/schemas';
import { body, routeId, ok, type IdContext } from '@/lib/ops/http';
export const POST = withAdmin<IdContext>(async (r,_a,c) => { const v = await body(r,z.object({ expiresAt:timestamp.optional() })); const link = await rotateBookingShareLink(await routeId(c),v.expiresAt); return ok({ url:`/r/${link.token}`,expiresAt:link.expiresAt }); });
export const DELETE = withAdmin<IdContext>(async (_r,_a,c) => { await revokeBookingShareLink(await routeId(c)); return ok(); });
