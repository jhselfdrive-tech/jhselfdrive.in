/**
 * Rental days for a handover window. Any part-day beyond a full 24h block is
 * charged as another day, with a one-day floor. Shared by the availability
 * list, the booking action and the admin UI so every quoted price agrees.
 */
export function calculateBookingDays(startAt: Date | string, endAt: Date | string): number {
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const end = typeof endAt === "string" ? new Date(endAt) : endAt;
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 1;
  return Math.max(1, Math.ceil(diffMs / 86_400_000));
}

export function quoteRental(dayRate: number, startAt: Date | string, endAt: Date | string) {
  const days = calculateBookingDays(startAt, endAt);
  return { days, amountTotal: Math.round(dayRate * days) };
}
