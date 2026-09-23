import { z } from 'zod';
import { site } from '@/content/site';
import { normalizeIndianPhone } from '@/lib/phone';
const text = (max: number) => z.string().trim().max(max).default('');
export const timestamp = z.iso.datetime({ offset: true });
export const rangeSchema = z.object({ startAt: timestamp, endAt: timestamp }).refine(v => new Date(v.endAt) > new Date(v.startAt), { message: 'Return must be after pickup.' });
export const quoteSchema = rangeSchema.safeExtend({ vehicleId: z.uuid() });
export const bookingSchema = quoteSchema.safeExtend({
  customerId: z.uuid().optional(), customer: z.object({ phone: z.string().trim().transform((value,ctx) => { const phone = normalizeIndianPhone(value); if (!phone) { ctx.addIssue({ code:'custom',message:'Enter a valid Indian mobile number.' }); return z.NEVER; } return phone; }), fullName: z.string().trim().min(1).max(120), city: text(100) }).optional(),
  status: z.enum(['approved','confirmed','ongoing','completed']),
  amountTotal: z.number().min(0).max(10_000_000).optional(), deposit: z.number().min(0).max(10_000_000).optional(), notes: text(4000),
}).refine(v => Boolean(v.customerId) !== Boolean(v.customer), { message: 'Choose an existing customer or enter a new customer.' });
export const paymentSchema = z.object({ kind: z.enum(['rental','deposit','refund']), amount: z.number().positive().max(10_000_000), method: z.enum(['cash','upi','bank','other']), note: text(300) });
export const handoverSchema = z.object({ phase: z.enum(['delivery','return']), odometerKm: z.number().int().nonnegative().optional(), fuelEighths: z.number().int().min(0).max(8).optional(), paymentReceived: z.boolean(), paymentAmount: z.number().min(0).max(10_000_000), depositAmount: z.number().min(0).max(10_000_000), damageNotes: text(1500), notes: text(1500) });
export const mediaSchema = z.object({ phase: z.enum(['delivery','return']), mediaType: z.enum(['licence_front','licence_back','vehicle_condition']) });
export const reminderSchema = z.object({ bookingId: z.uuid(), reminder: z.enum(['pickup','return_due','overdue']), onDate: z.iso.date(), outcome: z.enum(['sent','skipped']) });
export const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(4).max(15), displayName: text(80), categorySlug: z.string().refine(v => site.fleet.some(c => c.slug === v), 'Choose a vehicle category.'), model: text(80),
  year: z.number().int().min(1980).max(2100).optional(), transmission: text(40), fuel: text(40), seats: z.number().int().min(1).max(60).optional(), status: z.enum(['active','maintenance','retired','sold']),
  odometerKm: z.number().int().nonnegative().optional(), acquiredOn: z.union([z.literal(''), z.iso.date()]).optional(), notes: text(1500),
  dayRate: z.number().min(0).max(1_000_000), kmRate: z.number().nonnegative().optional(), includedKmPerDay: z.number().int().nonnegative().optional(), deposit: z.number().min(0).max(1_000_000), tagline: text(120), description: text(1500), isBookable: z.boolean(),
});
export const documentSchema = z.object({ docType: z.enum(['insurance','fitness','permit','puc','road_tax']), provider: text(100), referenceNumber: text(100), issuedOn: z.union([z.literal(''), z.iso.date()]).optional(), expiresOn: z.iso.date(), notes: text(500) }).refine(v => !v.issuedOn || v.expiresOn >= v.issuedOn, { message: 'Expiry must be on or after issue date.' });

// Preserve absent PATCH keys: defaults belong to creation, not partial updates.
const nullableVehicleFields = {
  year: vehicleSchema.shape.year.unwrap().nullable().optional(),
  seats: vehicleSchema.shape.seats.unwrap().nullable().optional(),
  odometerKm: vehicleSchema.shape.odometerKm.unwrap().nullable().optional(),
  kmRate: vehicleSchema.shape.kmRate.unwrap().nullable().optional(),
  includedKmPerDay: vehicleSchema.shape.includedKmPerDay.unwrap().nullable().optional(),
};
const partialVehicle = vehicleSchema.partial().extend(nullableVehicleFields);
export const vehiclePatchSchema = z.record(z.string(),z.unknown()).transform((raw,ctx) => {
  const result = partialVehicle.safeParse(raw);
  if (!result.success) { for (const issue of result.error.issues) ctx.addIssue({ code:"custom",message:issue.message,path:issue.path }); return z.NEVER; }
  return Object.fromEntries(Object.entries(result.data).filter(([key]) => Object.hasOwn(raw,key)));
}).refine(v => Object.keys(v).length > 0, 'Provide vehicle fields to update.');
