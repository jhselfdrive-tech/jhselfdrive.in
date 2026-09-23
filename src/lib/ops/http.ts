import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
export type IdContext = { params: Promise<{ id: string }> };
export async function routeId(context: IdContext) { return z.uuid().parse((await context.params).id); }
export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  return schema.parse(await request.json().catch(() => null));
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}
export function invalidateOps() {
  // Layout invalidation includes detail pages, calendar, customers and dashboard.
  revalidatePath('/admin', 'layout');
  revalidatePath('/cars', 'layout');
  revalidatePath('/');
  revalidatePath('/r/[token]', 'page');
}
export function ok(extra: Record<string, unknown> = {}) { invalidateOps(); return json({ ok: true, ...extra }); }
export function missing(label: string) { return json({ error: `${label} not found`, code: 'NOT_FOUND' }, 404); }
export async function multipart(request: Request, maxBytes = 4_000_000) {
  if (Number(request.headers.get('content-length')) > maxBytes + 100_000) {
    throw Object.assign(new Error('File is too large. Use the web panel for larger files.'), { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) throw Object.assign(new Error('Invalid multipart form.'), { status: 400 });
  const files = form.getAll('file');
  const file = files[0];
  if (files.length !== 1 || !(file instanceof File) || !file.size) throw Object.assign(new Error('Choose one file.'), { status: 400 });
  if (file.size > maxBytes) throw Object.assign(new Error('File is too large. Use the web panel for larger files.'), { status: 413 });
  return { form, file };
}
