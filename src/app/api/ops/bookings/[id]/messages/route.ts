import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { listBookingMessages } from '@/lib/admin/messages';
import { messageRow } from '@/lib/ops/serialize';
import { routeId, json, type IdContext } from '@/lib/ops/http';
export const GET = withAdmin<IdContext>(async (_r,_a,c) => json({ messages: (await listBookingMessages(await routeId(c))).map(messageRow) }));
