import { describe, expect, it } from 'vitest';
import { adminBookingInput, initialBookingWindow } from './admin-form';
import { bookingSchema } from '@/lib/ops/schemas';
import { quoteRental } from './pricing';

const id = '00000000-0000-4000-8000-000000000001';
function form(extra: Record<string, string> = {}) {
  const values = new FormData();
  for (const [key, value] of Object.entries({ vehicleId: id, fullName: 'Test Customer', phone: '\u202a+971 50 180 1938\u202c', city: 'Dubai', startAt: '2026-09-23T09:00', endAt: '2026-09-25T09:00', status: 'approved', ...extra })) values.set(key, value);
  return values;
}

describe('web admin booking contract', () => {
  it('uses the IST calendar date at midnight and defaults to an exact 24 hours', () => {
    const window = initialBookingWindow(new Date('2026-09-23T19:00:00Z'));
    expect(window).toEqual({ startAt: '2026-09-24T09:00', endAt: '2026-09-25T09:00' });
    expect(initialBookingWindow(new Date('2026-12-31T18:31:00Z'))).toEqual({ startAt: '2027-01-01T09:00', endAt: '2027-01-02T09:00' });
  });

  it('matches the native API contract and preserves international numbers and two-day pricing', () => {
    const input = bookingSchema.parse(adminBookingInput(form()));
    expect(input.customer?.phone).toBe('+971501801938');
    expect(input.startAt).toBe('2026-09-23T09:00:00+05:30');
    expect(quoteRental(2500, input.startAt, input.endAt)).toEqual({ days: 2, amountTotal: 5000 });
    expect(input).not.toHaveProperty('amountTotal');
    expect(input).not.toHaveProperty('deposit');
  });

  it('chooses the existing customer without also creating an inline customer', () => {
    const input = bookingSchema.parse(adminBookingInput(form({ customerId: id })));
    expect(input.customerId).toBe(id);
    expect(input).not.toHaveProperty('customer');
  });

  it('omits unchecked overrides but preserves explicitly chosen zero values', () => {
    expect(adminBookingInput(form({ amountTotal: '123', deposit: '456' }))).not.toHaveProperty('amountTotal');
    const input = bookingSchema.parse(adminBookingInput(form({ overrideAmount: 'on', amountTotal: '99.50', overrideDeposit: 'on', deposit: '0' })));
    expect(input.amountTotal).toBe(99.5);
    expect(input.deposit).toBe(0);
  });

  it('rejects invalid form ranges, missing vehicles and bad overrides through the API schema', () => {
    const invalid: Record<string, string>[] = [{ endAt: '2026-09-23T09:00' }, { vehicleId: '' }, { overrideAmount: 'on', amountTotal: '-1' }, { overrideDeposit: 'on', deposit: 'invalid' }, { overrideAmount: 'on', amountTotal: '' }];
    for (const extra of invalid) {
      expect(bookingSchema.safeParse(adminBookingInput(form(extra))).success).toBe(false);
    }
  });
});
