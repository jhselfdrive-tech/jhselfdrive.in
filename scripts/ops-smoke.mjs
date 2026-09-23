import { readdir, readFile } from 'node:fs/promises';
const base = process.env.OPS_SMOKE_URL || 'http://localhost:3000';
const id = '00000000-0000-4000-8000-000000000001';
const routes = [];
async function discover(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await discover(`${dir}/${entry.name}`, `${prefix}/${entry.name}`);
    else if (entry.name === 'route.ts' && !['/cron'].includes(prefix)) {
      const source = await readFile(`${dir}/${entry.name}`, 'utf8');
      for (const match of source.matchAll(/export const (GET|POST|PATCH|DELETE)\s*=\s*withAdmin/g)) routes.push({ path: `/api/ops${prefix.replaceAll('[id]', id)}`, method: match[1] });
      for (const match of source.matchAll(/export const (GET|POST|PATCH|DELETE)\s*=/g)) {
        if (!routes.some(r => r.path === `/api/ops${prefix.replaceAll('[id]', id)}` && r.method === match[1])) throw new Error(`Unwrapped route: ${prefix} ${match[1]}`);
      }
    }
  }
}
async function token(email, password) {
  if (!email || !password) return null;
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error('Smoke-account login failed');
  return data.access_token;
}
let count = 0;
async function check(route, bearer, expected, body = undefined) {
  const headers = { 'content-type': 'application/json' };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const response = await fetch(base + route.path, { method: route.method, headers, body: route.method === 'GET' ? undefined : JSON.stringify(body ?? {}), redirect: 'manual' });
  const data = await response.text();
  if (!expected.includes(response.status)) throw new Error(`${route.method} ${route.path}: expected ${expected}, got ${response.status}; ${data.slice(0,150)}`);
  if (route.path !== '/api/ops/devices' && !response.headers.get('cache-control')?.includes('no-store')) throw new Error(`Missing no-store: ${route.path}`);
  count++;
  return data ? JSON.parse(data) : null;
}
await discover('src/app/api/ops');
const admin = process.env.OPS_SMOKE_ADMIN_TOKEN || await token(process.env.OPS_SMOKE_ADMIN_EMAIL, process.env.OPS_SMOKE_ADMIN_PASSWORD);
const nonAdmin = process.env.OPS_SMOKE_NONADMIN_TOKEN || await token(process.env.OPS_SMOKE_NONADMIN_EMAIL, process.env.OPS_SMOKE_NONADMIN_PASSWORD);
for (const route of routes) {
  await check(route, null, [401]);
  await check(route, 'garbage-token', [401]);
  if (nonAdmin) await check(route, nonAdmin, [403]);
}
if (admin) {
  for (const path of ['/meta', '/summary', '/requests', '/bookings', '/customers', '/vehicles', '/alerts', '/reminders', '/metrics', '/calendar?start=2026-09-23&days=14']) await check({ path: `/api/ops${path}`, method: 'GET' }, admin, [200]);
  for (const path of ['/bookings', '/quote', '/reminders/resolve', '/vehicles', `/bookings/${id}/payments`, `/bookings/${id}/handover`, `/bookings/${id}/vehicle`, `/bookings/${id}/deposit`, `/bookings/${id}/transition`, `/vehicles/${id}/blocks`, `/vehicles/${id}/photos/reorder`]) await check({ path: `/api/ops${path}`, method: 'POST' }, admin, [400], { malformed: true });
  await check({ path: '/api/ops/bookings?cursor=not-json', method: 'GET' }, admin, [400]);
}
// Explicit fixture requests cover happy writes and known conflicts without hardcoded
// production IDs. Each fixture includes method, path, body and expected statuses.
if (process.env.OPS_SMOKE_MUTATIONS === '1') {
  if (!admin || !process.env.OPS_SMOKE_FIXTURES) throw new Error('Mutating checks need an admin and OPS_SMOKE_FIXTURES');
  const fixtures = JSON.parse(await readFile(process.env.OPS_SMOKE_FIXTURES, 'utf8'));
  for (const fixture of fixtures) await check(fixture, admin, fixture.expected, fixture.body);
}
console.log(`Passed ${count} HTTP checks across ${routes.length} admin method/route pairs.`);
if (!admin || !nonAdmin) console.log('PARTIAL: set admin and non-admin smoke credentials to exercise authenticated contracts.');

// Optional real multipart checks against a dedicated, empty booking. The only
// created media row is deleted in finally, and bucket contents are compared to
// prove a duplicate licence did not leave an orphaned object.
if (process.env.OPS_SMOKE_MUTATIONS === '1' && process.env.OPS_SMOKE_MEDIA_BOOKING_ID) {
  const { createClient } = await import('@supabase/supabase-js');
  if (!admin || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Media checks require admin and service-role credentials');
  const booking = process.env.OPS_SMOKE_MEDIA_BOOKING_ID;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const bucket = client.storage.from('rental-identity');
  const prefix = `bookings/${booking}/delivery/licence_front`;
  async function objects() { const { data,error } = await bucket.list(prefix); if (error) throw error; return (data || []).map(x => x.name).sort(); }
  const before = await objects();
  if (before.length) throw new Error('Media test requires an empty delivery licence-front slot');
  async function upload(bytes, mime, expected) {
    const form = new FormData(); form.set('phase', 'delivery'); form.set('mediaType', 'licence_front');
    form.set('file', new Blob([bytes], { type: mime }), mime === 'image/heic' ? 'test.heic' : 'test.png');
    const response = await fetch(`${base}/api/ops/bookings/${booking}/media`, { method: 'POST', headers: { authorization: `Bearer ${admin}` }, body: form });
    if (response.status !== expected) throw new Error(`Media contract expected ${expected}, got ${response.status}`);
    return response.json();
  }
  let mediaId;
  try {
    await upload(new Uint8Array([0,1,2]), 'image/heic', 400);
    await upload(new Uint8Array(5_000_000), 'image/png', 413);
    const image = await readFile('ios/JHOps/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png');
    mediaId = (await upload(image, 'image/png', 200)).mediaId;
    const one = await objects();
    await upload(image, 'image/png', 409);
    if (JSON.stringify(await objects()) !== JSON.stringify(one)) throw new Error('Duplicate licence upload leaked an object');
  } finally {
    if (mediaId) await check({ path: `/api/ops/media/${mediaId}`, method: 'DELETE' }, admin, [200]);
  }
  if (JSON.stringify(await objects()) !== JSON.stringify(before)) throw new Error('Media test cleanup incomplete');
  console.log('Passed HEIC, oversize, duplicate licence and storage-cleanup checks.');
}
