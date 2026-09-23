import { beforeEach,describe,expect,it,vi } from 'vitest';
import { z } from 'zod';
vi.mock('@/lib/admin/auth',() => ({ verifyAdmin:vi.fn(),AdminAuthError:class extends Error { constructor(readonly status: number,message:string) { super(message); } } }));
import { verifyAdmin,AdminAuthError } from '@/lib/admin/auth';
import { withAdmin } from './auth';
beforeEach(() => { vi.clearAllMocks(); });
describe('admin route gate',() => {
 it.each([401,403] as const)('stops before handler execution for %s',async status => {
  vi.mocked(verifyAdmin).mockRejectedValue(new AdminAuthError(status,'Denied'));
  const handler = vi.fn(); const response = await withAdmin(handler)(new Request('https://example.test'),undefined);
  expect(response.status).toBe(status); expect(handler).not.toHaveBeenCalled(); expect(response.headers.get('cache-control')).toBe('no-store');
 });
 it('turns a cookie login redirect into 401 JSON',async () => {
  vi.mocked(verifyAdmin).mockRejectedValue({ digest:'NEXT_REDIRECT;replace;/admin/login;307;' });
  expect((await withAdmin(vi.fn())(new Request('https://example.test'),undefined)).status).toBe(401);
 });
 it('maps malformed authenticated requests to 400',async () => {
  vi.mocked(verifyAdmin).mockResolvedValue({ id:'a',email:'admin@example.test',fullName:'Admin' });
  const response = await withAdmin(async () => { z.uuid().parse('invalid'); return Response.json({}); })(new Request('https://example.test'),undefined);
  expect(response.status).toBe(400);
 });
 it('returns no-store even when the handler forgets',async () => {
  vi.mocked(verifyAdmin).mockResolvedValue({ id:'a',email:'admin@example.test',fullName:'Admin' });
  const response = await withAdmin(async () => Response.json({ ok:true }))(new Request('https://example.test'),undefined);
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
 });
});
