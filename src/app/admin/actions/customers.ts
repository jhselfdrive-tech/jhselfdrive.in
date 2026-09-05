"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCustomerNotes, updateCustomerTags } from "@/lib/admin/data";

const tagsSchema = z.object({ id: z.uuid(), tags: z.string().max(500) });
export async function updateCustomerTagsAction(formData: FormData) {
  const parsed = tagsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateCustomerTags(parsed.data.id, parsed.data.tags.split(","));
  revalidatePath(`/admin/customers/${parsed.data.id}`); revalidatePath("/admin/customers");
}

const notesSchema = z.object({ id: z.uuid(), notes: z.string().max(4000) });
export async function updateCustomerNotesAction(formData: FormData) {
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateCustomerNotes(parsed.data.id, parsed.data.notes);
  revalidatePath(`/admin/customers/${parsed.data.id}`);
}
