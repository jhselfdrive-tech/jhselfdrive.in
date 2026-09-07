const INDIA_TIME_ZONE = "Asia/Kolkata";

type DateInput = Date | string | number;

export function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function formatIstDateTime(value: DateInput) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function formatIstDate(value: DateInput) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: INDIA_TIME_ZONE, day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function rentalDurationLabel(startAt: DateInput, endAt: DateInput) {
  const hours = Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3_600_000);
  if (hours < 24) return `${Math.round(hours * 10) / 10} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function fuelLabel(eighths: number | null | undefined) {
  if (eighths === null || eighths === undefined) return "Not recorded";
  if (eighths <= 0) return "Empty";
  if (eighths >= 8) return "Full";
  return `${eighths}/8 tank`;
}
