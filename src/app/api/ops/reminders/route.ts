import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { dueReminders } from '@/lib/admin/messages';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async () => json({ reminders: await dueReminders() }));
