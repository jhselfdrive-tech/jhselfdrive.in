"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-ssr";
import { isAllowedAdmin } from "@/lib/admin/auth";

export type LoginState = { message?: string };

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
});

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { message: "Unable to sign in. Check your details and try again." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user?.email || !(await isAllowedAdmin(data.user.email))) {
      await supabase.auth.signOut();
      return { message: "Unable to sign in. Check your details and try again." };
    }
  } catch (error) {
    console.error("Admin sign-in failed", error);
    return { message: "Unable to sign in. Check your details and try again." };
  }
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
