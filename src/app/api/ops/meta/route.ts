import { withAdmin } from '@/lib/ops/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { site } from '@/content/site';
import { BOOKING_STATUSES, STATUS_LABEL, TRANSITION_LABEL } from '@/lib/bookings/status';
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/bookings/payments';
import { json } from '@/lib/ops/http';
export const GET = withAdmin(async () => json({ apiVersion: 1, minAppBuild: Number(process.env.OPS_MIN_APP_BUILD || 1), categories: site.fleet.map(c => ({ id: c.slug, label: c.name })), statuses: BOOKING_STATUSES.map(id => ({ id, label: STATUS_LABEL[id] })), transitionLabels: TRANSITION_LABEL, paymentKinds: Object.entries(PAYMENT_KIND_LABEL).map(([id,label]) => ({ id,label })), paymentMethods: Object.entries(PAYMENT_METHOD_LABEL).map(([id,label]) => ({ id,label })), documentTypes: ['insurance','fitness','permit','puc','road_tax'].map(id => ({ id,label: id.replaceAll('_',' ') })), mediaTypes: ['licence_front','licence_back','vehicle_condition'].map(id => ({ id,label: id.replaceAll('_',' ') })) }));
