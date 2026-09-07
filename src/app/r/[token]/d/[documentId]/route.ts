import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSharedBooking } from "@/lib/share/public";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string; documentId: string }> }) {
  const { token, documentId } = await params;
  const shared = await getSharedBooking(token);
  const document = shared?.documents.find((item) => item.id === documentId);
  if (!document?.file_path) return new Response("This link is no longer active.", { status: 404 });
  const { data, error } = await getSupabaseAdmin().storage.from("rental-documents").createSignedUrl(document.file_path, 600);
  if (error || !data.signedUrl) return new Response("This link is no longer active.", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
