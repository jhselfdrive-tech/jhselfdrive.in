import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function isAllowedAdmin(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id,email,full_name")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const verifyAdmin = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) redirect("/admin/login");

  const allowed = await isAllowedAdmin(user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }
  return { id: user.id, email: user.email.toLowerCase(), fullName: allowed.full_name || user.email.split("@")[0] };
});
