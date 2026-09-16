export const PHOTOS_BUCKET = "fleet-photos";

/**
 * Public URL for an object in the public fleet-photos bucket. Deliberately
 * auth-free: the admin storage helpers all call verifyAdmin(), so they cannot
 * be used to render photos on the marketing site.
 */
export function publicPhotoUrl(filePath: string | null | undefined) {
  if (!filePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PHOTOS_BUCKET}/${filePath}`;
}
