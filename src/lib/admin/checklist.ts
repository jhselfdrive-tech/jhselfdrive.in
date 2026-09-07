export type ChecklistFacts = {
  has_delivery?: boolean | null;
  has_return?: boolean | null;
  amount_collected?: number | string | null;
  deposit_collected?: number | string | null;
  delivery_odometer_km?: number | null;
  return_odometer_km?: number | null;
  delivery_fuel_eighths?: number | null;
  return_fuel_eighths?: number | null;
  has_licence_front?: boolean | null;
  has_licence_back?: boolean | null;
  delivery_condition_count?: number | null;
  return_condition_count?: number | null;
  amount_total?: number | string | null;
};

export function checklistGaps(row?: ChecklistFacts | null) {
  if (!row) return [];
  const gaps: string[] = [];
  if (!row.has_delivery) gaps.push("Delivery checklist not recorded");
  if (row.delivery_odometer_km === null || row.delivery_odometer_km === undefined) gaps.push("Delivery odometer missing");
  if (row.delivery_fuel_eighths === null || row.delivery_fuel_eighths === undefined) gaps.push("Delivery fuel level missing");
  if (!row.has_licence_front) gaps.push("Licence front missing");
  if (!row.has_licence_back) gaps.push("Licence back missing");
  if (!row.delivery_condition_count) gaps.push("Delivery condition photos missing");
  if (!row.has_return) gaps.push("Return checklist not recorded");
  if (row.return_odometer_km === null || row.return_odometer_km === undefined) gaps.push("Return odometer missing");
  if (row.return_fuel_eighths === null || row.return_fuel_eighths === undefined) gaps.push("Return fuel level missing");
  if (!row.return_condition_count) gaps.push("Return condition photos missing");
  return gaps;
}

export function paymentSummary(row?: ChecklistFacts | null) {
  const total = Number(row?.amount_total || 0);
  const collected = Number(row?.amount_collected || 0);
  const deposit = Number(row?.deposit_collected || 0);
  return { total, collected, balance: Math.max(0, total - collected), deposit };
}

export function odometerWarning(previous: number | null | undefined, entered: number | null | undefined) {
  if (previous === null || previous === undefined || entered === null || entered === undefined || entered >= previous) return null;
  return `Entered odometer is ${previous - entered} km below the previous reading.`;
}
