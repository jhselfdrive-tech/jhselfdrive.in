import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { getBookingDetail, updateBooking } from '@/lib/admin/bookings';
import { listBookingMessages } from '@/lib/admin/messages';
import { listPayments } from '@/lib/admin/payments';
import { listBookingStatusEvents } from '@/lib/admin/data';
import { bookingDetail, messageRow, paymentRow } from '@/lib/ops/serialize';
import { body, ok, routeId, json, missing, type IdContext } from '@/lib/ops/http';
export const GET = withAdmin<IdContext>(async (_request,_admin,context) => {
 const id = await routeId(context);
 const [detail, messages, payments, events] = await Promise.all([getBookingDetail(id),listBookingMessages(id),listPayments(id),listBookingStatusEvents(id)]);
 if (!detail) return missing('Booking');
 return json({ ...bookingDetail(detail), dueMessages: messages.filter(m => m.status === 'due').length, payments: payments.map(paymentRow), messages: messages.map(messageRow), timeline: events.map(e => ({ id: e.id, fromStatus: e.from_status, toStatus: e.to_status, note: e.note, createdBy: e.created_by, createdAt: e.created_at })) });
});

import { bookingPatchSchema } from '@/lib/ops/schemas';
export const PATCH = withAdmin<IdContext>(async (r,a,c) => { await updateBooking(await routeId(c),await body(r,bookingPatchSchema),a.email); return ok(); });
