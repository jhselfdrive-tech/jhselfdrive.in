import { describe,expect,it } from 'vitest';
import { opsError } from './errors';
describe('ops errors',() => {
 it.each(['ILLEGAL_TRANSITION','VEHICLE_REQUIRED','VEHICLE_UNAVAILABLE','VEHICLE_BOOKED','VEHICLE_HAS_BOOKINGS','PAYMENT_FROM_HANDOVER','23P01','LICENCE_SLOT_OCCUPIED'])('maps %s to conflict',code => { expect(opsError({ code }).status).toBe(409); });
 it('recognises a PL/pgSQL exception message',() => { expect(opsError({ code:'P0001',message:'VEHICLE_UNAVAILABLE' })).toMatchObject({ status:409,code:'VEHICLE_UNAVAILABLE' }); });
 it('maps missing bookings to 404',() => { expect(opsError({ code:'BOOKING_NOT_FOUND' }).status).toBe(404); });
 it('does not disclose unexpected database or credential errors',() => { const result = opsError(new Error('secret database password')); expect(result.status).toBe(500); expect(result.message).not.toContain('secret'); });
});
