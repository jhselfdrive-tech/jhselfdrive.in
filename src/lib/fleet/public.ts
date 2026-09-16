import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { quoteRental } from "@/lib/bookings/pricing";
import { publicPhotoUrl } from "./photos";

export type BookableVehicle = {
  id: string;
  name: string;
  registrationNumber: string;
  categorySlug: string;
  model: string | null;
  year: number | null;
  transmission: string | null;
  fuel: string | null;
  seats: number | null;
  dayRate: number;
  kmRate: number | null;
  includedKmPerDay: number | null;
  deposit: number;
  tagline: string | null;
  photoUrl: string | null;
  days: number;
  amountTotal: number;
};

type Row = {
  id: string; registration_number: string; display_name: string | null; category_slug: string;
  model: string | null; year: number | null; transmission: string | null; fuel: string | null; seats: number | null;
  day_rate: string | number; km_rate: string | number | null; included_km_per_day: number | null;
  deposit: string | number; tagline: string | null; photo_path: string | null;
};

/**
 * Vehicles a customer can actually book for a window. Runs without an admin
 * session — this is the marketing site's entry point, so it must never leak
 * anything beyond what a booking card renders.
 */
export async function listBookableVehicles(startAt: string, endAt: string): Promise<BookableVehicle[]> {
  const { data, error } = await getSupabaseAdmin().rpc("list_bookable_vehicles", {
    p_start_at: startAt,
    p_end_at: endAt,
  });
  if (error) throw error;
  return ((data || []) as Row[]).map((row) => {
    const dayRate = Number(row.day_rate || 0);
    const { days, amountTotal } = quoteRental(dayRate, startAt, endAt);
    return {
      id: row.id,
      name: row.display_name || row.model || row.registration_number,
      registrationNumber: row.registration_number,
      categorySlug: row.category_slug,
      model: row.model,
      year: row.year,
      transmission: row.transmission,
      fuel: row.fuel,
      seats: row.seats,
      dayRate,
      kmRate: row.km_rate === null ? null : Number(row.km_rate),
      includedKmPerDay: row.included_km_per_day,
      deposit: Number(row.deposit || 0),
      tagline: row.tagline,
      photoUrl: publicPhotoUrl(row.photo_path),
      days,
      amountTotal,
    };
  });
}

/** One representative photo per public category, for the marketing fleet cards. */
export async function categoryPhotoUrls(): Promise<Record<string, string>> {
  // Marketing pages are statically rendered and must still build when Supabase
  // is not configured, so a failure here degrades to the CSS car illustration.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  const { data, error } = await getSupabaseAdmin()
    .from("vehicles")
    .select("category_slug,vehicle_photos(file_path,sort_order)")
    .eq("status", "active")
    .eq("is_bookable", true);
  if (error) {
    console.error("Category photo lookup failed", error);
    return {};
  }
  const photos: Record<string, string> = {};
  for (const row of (data || []) as Array<{ category_slug: string; vehicle_photos: Array<{ file_path: string; sort_order: number }> }>) {
    if (photos[row.category_slug]) continue;
    const first = [...(row.vehicle_photos || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    const url = publicPhotoUrl(first?.file_path);
    if (url) photos[row.category_slug] = url;
  }
  return photos;
}
