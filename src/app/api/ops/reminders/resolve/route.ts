import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { resolveReminder } from '@/lib/admin/messages';
import { reminderSchema } from '@/lib/ops/schemas';
import { body, ok } from '@/lib/ops/http';
export const POST = withAdmin(async request => { await resolveReminder(await body(request,reminderSchema)); return ok(); });
