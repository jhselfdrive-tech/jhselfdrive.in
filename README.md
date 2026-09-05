# JH Self Drive

Conversion-focused website and enquiry capture system for JH Self Drive, Ramanathapuram.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase publishable and service-role credentials.
2. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
3. Install and start: `npm install && npm run dev`.

The page itself renders without Supabase credentials. Form submissions and first-party analytics require them.

### Admin setup

Apply both database migrations in order, create an administrator in **Supabase → Authentication → Users**, then add the same lowercase email to the allowlist:

```sql
insert into public.admin_users (email, full_name)
values ('you@example.com', 'Your Name');
```

In **Authentication → Providers → Email**, disable public user signups. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel along with the existing server variables. The private operations console is available at `/admin`.

## Before launch

- Replace all `TODO` values in `src/content/site.ts`.
- Rotate the credential previously committed in `initial.md`; it remains in Git history.
- Set all `.env.example` variables in Vercel and connect `jhselfdrive.in`.
- Verify RLS using the browser anon client, GA4 DebugView and the repeat-phone enquiry scenario from the product brief.

## Vercel deployment

The root `vercel.json` explicitly selects Next.js and uses `npm ci` followed by `npm run build`. In the Vercel project, keep **Root Directory** empty (repository root), set the production branch to `main`, add the variables from `.env.example`, then redeploy. Secret values belong in Vercel Project Settings and must not be committed to this repository.

## Security model

Only the RLS-safe Supabase publishable key is shipped to the browser for authentication. The privileged service-role key remains server-only; all customer-facing tables have RLS enabled with no public policy. Enquiries are protected by a honeypot, a minimum completion time and a hashed-IP rate limit of five attempts per hour.
