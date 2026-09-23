import { describe,expect,it } from 'vitest';
import { bookingRow,first,messageRow,paymentRow,vehicleCard } from './serialize';
import type { BookingPayment } from '@/lib/bookings/payments';
import type { BookingMessage } from '@/lib/admin/messages';
import type { Vehicle } from '@/lib/admin/fleet';
describe('native serializers',() => {
 it('flattens object and array joins identically without exposing internal fields',() => {
  const customer = { id:'customer',full_name:'Meera',phone:'+919876543210' }, vehicle = { id:'car',display_name:'Swift',registration_number:'TN65AB1234' };
  const row = { id:'booking',status:'approved' as const,amount_total:2000,deposit:1000,customer,vehicle };
  expect(bookingRow(row)).toEqual(bookingRow({ ...row,customer:[customer],vehicle:[vehicle] }));
  expect(bookingRow(row)).toMatchObject({ customerName:'Meera',vehicleLabel:'Swift',amountTotal:2000 });
  expect(bookingRow(row)).not.toHaveProperty('customer');
 });
 it('handles absent joins',() => { expect(first([])).toBeNull(); expect(first(undefined)).toBeNull(); expect(bookingRow({ id:'b' })).toMatchObject({ customerName:'Unnamed customer',phone:'',vehicleLabel:null }); });
 it('preserves old payment keys and adds handover ownership',() => {
  const row = paymentRow({ id:'p',kind:'deposit',amount:1000,method:'upi',received_at:'2026-01-01',handover_id:'h',note:'Test' } as BookingPayment);
  expect(row).toEqual({ id:'p',kind:'deposit',amount:1000,method:'upi',receivedAt:'2026-01-01',handoverId:'h',note:'Test' });
 });
 it('does not expose raw message event keys or actor',() => { expect(messageRow({ id:'m',event_key:'secret',actor:'admin@example.test' } as BookingMessage)).not.toHaveProperty('event_key'); });
 it('converts numeric database rates for Swift decoding',() => { expect(vehicleCard({ day_rate:'2500',deposit:'1000' } as unknown as Vehicle)).toMatchObject({ dayRate:2500,deposit:1000 }); });
});
