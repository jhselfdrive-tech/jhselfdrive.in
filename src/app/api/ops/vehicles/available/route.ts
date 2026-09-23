import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { findAvailableVehicles } from '@/lib/admin/fleet';
import { rangeSchema } from '@/lib/ops/schemas';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async r => { const v = rangeSchema.safeExtend({ categorySlug:z.string().max(80).optional(),excludeBookingId:z.uuid().optional() }).parse(Object.fromEntries(new URL(r.url).searchParams)); return json({ vehicles:(await findAvailableVehicles(v.categorySlug || null,v.startAt,v.endAt,v.excludeBookingId)).map(v => ({ id:v.id,registrationNumber:v.registration_number,displayName:v.display_name,categorySlug:v.category_slug,model:v.model,seats:v.seats })) }); });
