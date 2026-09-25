import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',() => ({}));
vi.mock('next/cache',() => ({revalidatePath:vi.fn()}));
vi.mock('@/lib/admin/auth',() => ({verifyAdmin:vi.fn().mockResolvedValue({id:'admin',email:'ops@example.test'}),AdminAuthError:class extends Error {}}));
vi.mock('@/lib/admin/bookings',() => ({updateBooking:vi.fn()}));
vi.mock('@/lib/admin/data',() => ({updateCustomerProfile:vi.fn()}));
vi.mock('@/lib/admin/payments',() => ({updatePayment:vi.fn()}));
vi.mock('@/lib/admin/fleet',() => ({updateVehicleBlock:vi.fn(),updateVehicleDocument:vi.fn(),deleteVehicleBlock:vi.fn(),deleteVehicleDocument:vi.fn()}));
import {PATCH as booking} from '@/app/api/ops/bookings/[id]/route';
import {PATCH as customer} from '@/app/api/ops/customers/[id]/route';
import {PATCH as payment} from '@/app/api/ops/payments/[id]/route';
import {PATCH as block} from '@/app/api/ops/vehicles/blocks/[id]/route';
import {PATCH as document} from '@/app/api/ops/vehicles/documents/[id]/route';
import {updateBooking} from '@/lib/admin/bookings';
import {updateCustomerProfile} from '@/lib/admin/data';
import {updatePayment} from '@/lib/admin/payments';
import {updateVehicleBlock,updateVehicleDocument} from '@/lib/admin/fleet';
const id = '00000000-0000-4000-8000-000000000001';
const context = {params:Promise.resolve({id})};
const request = (body:unknown) => new Request('https://example.test/api/ops',{method:'PATCH',headers:{authorization:'Bearer test-admin','content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(() => vi.clearAllMocks());
it.each(['VEHICLE_UNAVAILABLE','BOOKING_LOCKED'])('maps booking %s to 409',async code => {
 vi.mocked(updateBooking).mockRejectedValueOnce(new Error(code));
 const result = await booking(request({endAt:'2037-01-05T00:00:00Z'}),context);
 expect(result.status).toBe(409); expect((await result.json()).code).toBe(code);
});
it('passes only supplied booking fields and authenticated actor',async () => {
 const result = await booking(request({notes:''}),context);
 expect(result.status).toBe(200); expect(updateBooking).toHaveBeenCalledWith(id,{notes:''},'ops@example.test');
});
it('maps duplicate normalized customer phone to helpful conflict',async () => {
 vi.mocked(updateCustomerProfile).mockRejectedValueOnce(new Error('CUSTOMER_PHONE_EXISTS'));
 const result = await customer(request({phone:'+971 50 180 1938'}),context);
 expect(result.status).toBe(409); expect((await result.json()).error).toBe('Another customer already uses this number.');
 expect(updateCustomerProfile).toHaveBeenCalledWith(id,{phone:'+971501801938'});
});
it('routes handover-linked payment conflicts to checklist',async () => {
 vi.mocked(updatePayment).mockRejectedValueOnce(new Error('PAYMENT_FROM_HANDOVER'));
 const result = await payment(request({amount:10}),context);
 expect(result.status).toBe(409); expect((await result.json()).error).toBe('Edit this in the handover checklist.');
});
it('maps block overlaps to 409',async () => {
 vi.mocked(updateVehicleBlock).mockRejectedValueOnce(new Error('VEHICLE_BOOKED'));
 expect((await block(request({endAt:'2037-01-05T00:00:00Z'}),context)).status).toBe(409);
});
it('ignores file paths in metadata edits',async () => {
 expect((await document(request({provider:'Insurer',filePath:'overwrite'}),context)).status).toBe(200);
 expect(updateVehicleDocument).toHaveBeenCalledWith(id,{provider:'Insurer'});
});
