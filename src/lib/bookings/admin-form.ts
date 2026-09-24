import { istTimestamp } from '@/lib/validation';

/** Local form values always represent IST, regardless of the browser's zone. */
export function initialBookingWindow(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const tomorrow = new Date(`${day}T09:00:00+05:30`);
  tomorrow.setTime(tomorrow.getTime() + 86_400_000);
  const nextDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
  return { startAt: `${day}T09:00`, endAt: `${nextDay}T09:00` };
}

export function adminBookingInput(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const customerId = text('customerId');
  return {
    ...(customerId ? { customerId } : { customer: { fullName: text('fullName'), phone: text('phone'), city: text('city') } }),
    vehicleId: text('vehicleId'), startAt: istTimestamp(text('startAt')), endAt: istTimestamp(text('endAt')),
    status: text('status'), notes: text('notes'),
    // Omission makes the server calculate prices under the vehicle lock.
    ...(form.get('overrideAmount') === 'on' ? { amountTotal: Number(text('amountTotal') || Number.NaN) } : {}),
    ...(form.get('overrideDeposit') === 'on' ? { deposit: Number(text('deposit') || Number.NaN) } : {}),
  };
}
