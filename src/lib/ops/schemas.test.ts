import { expect,it } from 'vitest';
import { bookingSchema,rangeSchema,paymentSchema,vehicleSchema,vehiclePatchSchema } from './schemas';
const base = { vehicleId:'00000000-0000-4000-8000-000000000001',startAt:'2026-01-01T00:00:00+05:30',endAt:'2026-01-02T00:00:00+05:30',status:'approved',customer:{ fullName:'Meera',phone:'9876543210' } };
it('normalizes customer identity like website bookings',() => { expect(bookingSchema.parse(base).customer?.phone).toBe('+919876543210'); });
it('accepts international customer identities',() => { expect(bookingSchema.parse({ ...base,customer:{ ...base.customer,phone:'+1 (202) 555-0123' } }).customer?.phone).toBe('+12025550123'); });
it('accepts copied UAE phone numbers with invisible direction marks',() => { expect(bookingSchema.parse({ ...base,customer:{ ...base.customer,phone:'\u202a+971 50 180 1938\u202c' } }).customer?.phone).toBe('+971501801938'); });
it('requires exactly one customer source',() => { expect(bookingSchema.safeParse({ ...base,customerId:base.vehicleId }).success).toBe(false); expect(bookingSchema.safeParse({ ...base,customer:undefined }).success).toBe(false); });
it('rejects inverted ranges including differing timezone offsets',() => { expect(rangeSchema.safeParse({ startAt:'2026-01-01T12:00:00Z',endAt:'2026-01-01T13:00:00+05:30' }).success).toBe(false); });
it('rejects negative payments and uncommitted booking statuses',() => { expect(paymentSchema.safeParse({ kind:'rental',method:'cash',amount:-1 }).success).toBe(false); expect(bookingSchema.safeParse({ ...base,status:'requested' }).success).toBe(false); });
it('requires explicit vehicle rates for creation',() => { expect(vehicleSchema.safeParse({ registrationNumber:'TN01AB12',status:'active' }).success).toBe(false); });

it('partial vehicle updates never inject creation defaults',() => { expect(vehiclePatchSchema.parse({ dayRate:1500 })).toEqual({ dayRate:1500 }); expect(vehiclePatchSchema.parse({ odometerKm:null })).toEqual({ odometerKm:null }); });

import { bookingPatchSchema,customerPatchSchema,paymentPatchSchema,blockPatchSchema,documentPatchSchema } from './schemas';
it('edit schemas preserve omissions and allow explicit clearing and zero',() => {
 expect(bookingPatchSchema.parse({ amountTotal:0,notes:'' })).toEqual({amountTotal:0,notes:''});
 expect(paymentPatchSchema.parse({amount:10})).toEqual({amount:10});
 expect(documentPatchSchema.parse({provider:''})).toEqual({provider:''});
 expect(customerPatchSchema.parse({phone:'+971 50 180 1938'})).toEqual({phone:'+971501801938'});
});
it('rejects empty, unknown-only, invalid and inverted edits',() => {
 for (const schema of [bookingPatchSchema,customerPatchSchema,paymentPatchSchema,blockPatchSchema,documentPatchSchema]) {
  expect(schema.safeParse({}).success).toBe(false); expect(schema.safeParse({arbitrary:'field'}).success).toBe(false);
 }
 expect(bookingPatchSchema.safeParse({startAt:base.endAt,endAt:base.startAt}).success).toBe(false);
 expect(blockPatchSchema.safeParse({startAt:base.endAt,endAt:base.startAt}).success).toBe(false);
 expect(documentPatchSchema.safeParse({issuedOn:'2026-02-01',expiresOn:'2026-01-01'}).success).toBe(false);
 expect(bookingPatchSchema.safeParse({amountTotal:-1}).success).toBe(false);
 expect(customerPatchSchema.safeParse({phone:'+0123'}).success).toBe(false);
});
