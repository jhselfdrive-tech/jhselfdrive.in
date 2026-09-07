# JH Self Drive

Conversion-focused website and enquiry capture system for JH Self Drive, Ramanathapuram.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase publishable and service-role credentials.
2. Run the migrations in `supabase/migrations` in numeric order in the Supabase SQL editor.
3. Install and start: `npm install && npm run dev`.

The page itself renders without Supabase credentials. Form submissions and first-party analytics require them.

### Admin setup

Apply all database migrations in order, create an administrator in **Supabase → Authentication → Users**, then add the same lowercase email to the allowlist:

```sql
insert into public.admin_users (email, full_name)
values ('you@example.com', 'Your Name');
```

In **Authentication → Providers → Email**, disable public user signups. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel along with the existing server variables. The private operations console is available at `/admin`.

### Fleet and availability

Migration `0003_fleet.sql` adds physical vehicles, document history, maintenance blocks, exact pickup/return timestamps and the database exclusion constraint that prevents overlapping vehicle bookings. After applying it, add each real car under `/admin/fleet`. Use `/admin/calendar` for the 30-day allocation view and assign an available physical vehicle while creating or editing a booking.

The availability picker is an operator convenience; PostgreSQL constraint `bookings_no_vehicle_overlap` remains the final concurrency-safe protection. Cancelled bookings release their slot immediately, and adjacent same-day handovers are allowed.

### Handovers, customer messages and vehicle papers

Migration `0004_handovers.sql` adds delivery/return checklists, private uploads and expiring customer paper links. Apply it in the Supabase SQL editor, then upload each vehicle's current compliance files under `/admin/fleet`. Booking operations are available from each row under `/admin/bookings`.

The `rental-documents` and `rental-identity` buckets are private by design. Do not create authenticated or anonymous Storage policies: admin reads pass through server-side allowlist verification, customer document links are revalidated and signed for 10 minutes, and licence files require an explicit admin reveal with a 60-second URL. Licence and condition files default to purge 90 days after the rental ends; overdue files appear on the admin dashboard with a manual purge action.

### GA4 reporting access

The admin console reads Google Analytics through the GA4 Data API so traffic numbers sit next to enquiries at `/admin` and `/admin/traffic`. This is separate from `NEXT_PUBLIC_GA_ID`, which only sends data to Google. One-time setup:

1. In the **Google Cloud Console**, select or create a project and enable the **Google Analytics Data API**.
2. Go to **IAM & Admin → Service Accounts**, create one (for example `ga-reader`), then **Keys → Add key → Create new key → JSON**. Copy `client_email` and `private_key` out of the downloaded file.
3. In **GA4 → Admin → Property access management**, add that `client_email` with the **Viewer** role.
4. In **GA4 → Admin → Property details**, copy the numeric **Property ID**. This is not the `G-XXXXXXXXXX` measurement ID.
5. Set `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` locally and in Vercel. Keep the private key quoted; the literal `\n` sequences are expanded at runtime.

Reports are cached for 15 minutes and the realtime counter for 1 minute, so the dashboard stays well inside the free GA4 API quota. Without these variables the console still works and the traffic panels show a setup note instead.

## Before launch

- Replace all `TODO` values in `src/content/site.ts`.
- Rotate the credential previously committed in `initial.md`; it remains in Git history.
- Set all `.env.example` variables in Vercel and connect `jhselfdrive.in`.
- Verify RLS using the browser anon client, GA4 DebugView and the repeat-phone enquiry scenario from the product brief.

## Vercel deployment

The root `vercel.json` explicitly selects Next.js and uses `npm ci` followed by `npm run build`. In the Vercel project, keep **Root Directory** empty (repository root), set the production branch to `main`, add the variables from `.env.example`, then redeploy. Secret values belong in Vercel Project Settings and must not be committed to this repository.

## Security model

Only the RLS-safe Supabase publishable key is shipped to the browser for authentication. The privileged service-role key remains server-only; all customer-facing tables have RLS enabled with no public policy. Enquiries are protected by a honeypot, a minimum completion time and a hashed-IP rate limit of five attempts per hour.
