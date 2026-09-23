import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { getFleetAlerts } from '@/lib/admin/fleet';
import { first } from '@/lib/ops/serialize';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async () => { const a = await getFleetAlerts(); return json({ alerts:[
 ...a.overdue.map(b => ({ id:`overdue:${b.id}`,bookingId:b.id,kind:'overdue',urgency:'urgent',label:`${first(b.customer)?.full_name || 'Customer'} — overdue return` })),
 ...a.unassigned.map(b => ({ id:`unassigned:${b.id}`,bookingId:b.id,kind:'unassigned',urgency:'warning',label:`${first(b.customer)?.full_name || 'Booking'} needs a vehicle` })),
 ...a.staleRequests.map(b => ({ id:`stale:${b.id}`,bookingId:b.id,kind:'stale',urgency:'warning',label:`${first(b.customer)?.full_name || 'Customer'} is waiting for approval` })),
 ...a.documents.map(d => ({ id:`document:${d.id}`,vehicleId:d.vehicle_id,kind:'document',urgency:d.days_remaining<0?'urgent':'warning',label:`${d.registration_number}: ${d.doc_type} expires ${d.expires_on}` })),
 ...a.checklist.map(c => ({ id:`checklist:${c.bookingId}`,bookingId:c.bookingId,kind:'checklist',urgency:'info',label:`${c.label}: ${c.gaps.join(', ')}` })),
 ...a.conflicts.map(c => ({ id:`conflict:${c.bookingId}`,bookingId:c.bookingId,kind:'conflict',urgency:'urgent',label:`${c.registrationNumber}: ${c.reason}` })),
 ] }); });
