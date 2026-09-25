import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',() => ({}));
vi.mock('@/lib/admin/auth',() => ({verifyAdmin:vi.fn().mockResolvedValue({email:'ops@example.test'})}));
const mocks = vi.hoisted(() => ({from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/supabase-server',() => ({getSupabaseAdmin:() => mocks}));
import {updateCustomerProfile} from './data';
import {updatePayment} from './payments';
import {updateVehicleBlock,updateVehicleDocument} from './fleet';
import {updateBooking} from './bookings';
function query(result:unknown) {
 const q = {update:vi.fn(),select:vi.fn(),eq:vi.fn(),is:vi.fn(),maybeSingle:vi.fn().mockResolvedValue(result)};
 for (const name of ['update','select','eq','is'] as const) q[name].mockReturnValue(q);
 return q;
}
beforeEach(() => {vi.clearAllMocks();});
it('translates unique phone conflict without changing tags or omitted profile fields',async () => {
 const q = query({data:null,error:{code:'23505'}}); mocks.from.mockReturnValue(q);
 await expect(updateCustomerProfile('c',{phone:'+971501801938'})).rejects.toMatchObject({code:'CUSTOMER_PHONE_EXISTS'});
 expect(q.update).toHaveBeenCalledWith({phone:'+971501801938'});
});
it('refuses a handover payment before attempting an update',async () => {
 const q = query({data:{id:'p',handover_id:'h'},error:null}); mocks.from.mockReturnValue(q);
 await expect(updatePayment('p',{amount:50})).rejects.toThrow('PAYMENT_FROM_HANDOVER');
 expect(q.update).not.toHaveBeenCalled();
});
it('updates only a standalone payment, retaining a database handover guard',async () => {
 const q = query({data:{id:'p',handover_id:null},error:null}); mocks.from.mockReturnValue(q);
 await updatePayment('p',{amount:50});
 expect(q.update).toHaveBeenCalledWith({amount:50}); expect(q.is).toHaveBeenCalledWith('handover_id',null);
});
it('checks a one-sided block edit against the stored other date',async () => {
 const q = query({data:{id:'b',start_at:'2037-01-02',end_at:'2037-01-04'},error:null}); mocks.from.mockReturnValue(q);
 await expect(updateVehicleBlock('b',{endAt:'2037-01-01T00:00:00Z'})).rejects.toThrow('INVALID_HANDOVER_RANGE');
 expect(q.update).not.toHaveBeenCalled();
});
it('maps document date constraints and never modifies storage metadata',async () => {
 const q = query({data:null,error:{code:'23514'}}); mocks.from.mockReturnValue(q);
 await expect(updateVehicleDocument('d',{expiresOn:'2037-01-01'})).rejects.toThrow('INVALID_DOCUMENT_RANGE');
 expect(q.update).toHaveBeenCalledWith({expires_on:'2037-01-01'});
});
it('uses the atomic booking RPC and distinguishes clearing notes from omission',async () => {
 mocks.rpc.mockResolvedValue({error:null});
 await updateBooking('b',{notes:'',deposit:0},'ops@example.test');
 expect(mocks.rpc).toHaveBeenCalledWith('update_admin_booking',expect.objectContaining({p_booking_id:'b',p_actor:'ops@example.test',p_notes:'',p_set_notes:true,p_deposit:0}));
 await updateBooking('b',{amountTotal:3000},'ops@example.test');
 expect(mocks.rpc).toHaveBeenLastCalledWith('update_admin_booking',expect.objectContaining({p_set_notes:false,p_amount_total:3000}));
});
