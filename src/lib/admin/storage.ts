import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdmin } from "./auth";

export const DOCUMENTS_BUCKET = "rental-documents";
export const IDENTITY_BUCKET = "rental-identity";

export async function uploadObject(bucket: string, path: string, bytes: ArrayBuffer, contentType: string) {
  await verifyAdmin();
  const { error } = await getSupabaseAdmin().storage.from(bucket).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

export async function signObject(bucket: string, path: string, expiresIn = 600) {
  await verifyAdmin();
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function signObjects(bucket: string, paths: string[], expiresIn = 600) {
  await verifyAdmin();
  if (!paths.length) return new Map<string, string>();
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error) throw error;
  return new Map((data || []).filter((item) => item.signedUrl).map((item) => [item.path || "", item.signedUrl]));
}

export async function removeObjects(bucket: string, paths: string[]) {
  await verifyAdmin();
  if (!paths.length) return;
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove(paths);
  if (error) throw error;
}
