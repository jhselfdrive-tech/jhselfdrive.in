/** Public error contract shared by native routes and web actions. Never expose SQL details. */
const failures: Record<string, [number, string]> = {
  ILLEGAL_TRANSITION: [409, "That change is not allowed from the booking's current state."],
  VEHICLE_REQUIRED: [409, "Assign a vehicle first."],
  VEHICLE_UNAVAILABLE: [409, "That car is unavailable for these dates."],
  VEHICLE_BOOKED: [409, "That vehicle already has a booking during those times."],
  VEHICLE_HAS_BOOKINGS: [409, "This vehicle has bookings and cannot be deleted."],
  BOOKING_LOCKED: [409, "Cancelled or rejected bookings cannot be edited."],
  CUSTOMER_PHONE_EXISTS: [409, "Another customer already uses this number."],
  PAYMENT_NOT_FOUND: [404, "Payment not found."],
  BLOCK_NOT_FOUND: [404, "Block not found."],
  DOCUMENT_NOT_FOUND: [404, "Document not found."],
  INVALID_DOCUMENT_RANGE: [400, "Expiry must be on or after issue date."],
  BOOKING_NOT_FOUND: [404, "Booking not found."],
  VEHICLE_NOT_FOUND: [404, "Vehicle not found."],
  CUSTOMER_NOT_FOUND: [404, "Customer not found."],
  PAYMENT_FROM_HANDOVER: [409, "Edit this in the handover checklist."],
  LICENCE_SLOT_OCCUPIED: [409, "That licence slot already has a file. Delete it first."],
  REMINDER_HANDLED: [409, "That reminder was already handled."],
  PHONE_REQUIRED: [400, "That booking has no phone number to message."],
  INVALID_HANDOVER_RANGE: [400, "Return must be after pickup."],
  '23P01': [409, "That vehicle is already reserved during these dates."],
  '23505': [409, "That record already exists."],
  '23503': [409, "This record is missing or is still in use."],
};
export function opsError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  const code = Object.keys(failures).find(key => value?.code === key || value?.message?.includes(key)) || 'INTERNAL_ERROR';
  const [status, message] = failures[code] || [500, 'Request failed. Please try again.'];
  return { status, code, message };
}
