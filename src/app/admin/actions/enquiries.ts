"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateEnquiryStatus } from "@/lib/admin/data";

const schema = z.object({ id: z.uuid(), status: z.enum(["new", "contacted", "lost"]) });

export async function updateEnquiryStatusAction(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateEnquiryStatus(parsed.data.id, parsed.data.status);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}
