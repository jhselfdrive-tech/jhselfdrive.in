"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { site } from "@/content/site";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { enquirySchema } from "@/lib/validation";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

export type EnquiryState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  whatsappUrl?: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeIpHash(ip: string) {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt || salt.length < 32) throw new Error("RATE_LIMIT_SALT must be at least 32 characters");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function submitEnquiry(_: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  if (Date.now() - data.startedAt < 2500) return { ok: false, message: "Please wait a moment and try again." };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (data.pickupDate < today) return { ok: false, message: "Pickup date cannot be in the past.", fieldErrors: { pickupDate: ["Choose today or a future date"] } };

  if (!site.fleet.some((car) => car.slug === data.carSlug)) return { ok: false, message: "Please choose a valid car." };

  try {
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
    const ipHash = safeIpHash(ip);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc("record_enquiry", {
      p_phone: data.phone,
      p_full_name: data.fullName,
      p_car_slug: data.carSlug,
      p_pickup_date: isoDate(data.pickupDate),
      p_return_date: isoDate(data.returnDate),
      p_message: data.message,
      p_source: data.source,
      p_utm_source: data.utmSource,
      p_utm_medium: data.utmMedium,
      p_utm_campaign: data.utmCampaign,
      p_ip_hash: ipHash,
      p_session_id: data.sessionId,
    });
    if (error?.message.includes("RATE_LIMITED")) return { ok: false, message: "Too many enquiries from this connection. Please call or try again later." };
    if (error) throw error;

    const car = site.fleet.find((item) => item.slug === data.carSlug)!;
    const message = [`Hi ${site.name}, I just sent an enquiry.`, `Name: ${data.fullName}`, `Car: ${car.name}`, `Dates: ${isoDate(data.pickupDate)} to ${isoDate(data.returnDate)}`, data.message ? `Note: ${data.message}` : ""].filter(Boolean).join("\n");
    return { ok: true, whatsappUrl: businessWhatsAppUrl(message) };
  } catch (error) {
    console.error("Enquiry submission failed", error);
    return { ok: false, message: "We could not save your enquiry. Please call or WhatsApp us directly." };
  }
}
