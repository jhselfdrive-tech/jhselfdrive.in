import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { listCustomers } from '@/lib/admin/data';
import { customerRow } from '@/lib/ops/serialize';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async r => { const filters = z.object({ search:z.string().max(100).optional(),segment:z.string().max(40).optional() }).parse(Object.fromEntries(new URL(r.url).searchParams)); return json({ customers:(await listCustomers(filters)).map(customerRow) }); });
