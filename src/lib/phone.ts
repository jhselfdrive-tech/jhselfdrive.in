/** Store one international identity; bare Indian mobiles remain convenient. */
export function normalizePhone(input: string): string | null {
  // Contact/WhatsApp copies may wrap numbers in invisible direction marks.
  // Normalize presentation characters without changing the phone's digits.
  const value = input.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/\p{Pd}/gu, "-").trim();
  // Permit formatting, but never silently discard letters or extensions.
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let compact = value.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (/^[6-9]\d{9}$/.test(compact)) compact = `+91${compact}`;
  else if (/^91[6-9]\d{9}$/.test(compact)) compact = `+${compact}`;

  // International numbers must include their country code (7–15 digits).
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) return null;
  if (compact.startsWith("+91") && !/^\+91[6-9]\d{9}$/.test(compact)) return null;
  return compact;
}
