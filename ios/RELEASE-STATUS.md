# JH Ops implementation / release status

Updated 23 September 2026.

## Implemented locally

- Five-tab native app with booking creation and quoting, payments, assignment,
  deposit return, reminders, messages, handovers, camera/Photos JPEG uploads,
  restricted licence reveal, share links, customer editing, fleet management,
  calendar lanes and performance metrics.
- 38 new admin method/route pairs; 44 total excluding the cron endpoint. The
  original requests route and existing booking-detail keys remain compatible.
- Transactional admin-booking migration, shared upload compensation, consistent
  error contracts, web revalidation, read-only screen caches, push routing.
- Icon/color assets, three privacy manifests, configuration-driven push,
  aligned bundle versions, signed-bundle verification and release.sh upload flow.

## Verified

- 151 Vitest tests; ESLint; Next.js production build.
- 88 live localhost HTTP checks: missing and garbage tokens rejected across all
  44 admin method/route pairs. Authenticated live checks were not run without
  dedicated admin and non-admin smoke-account credentials.
- PostgreSQL 17 isolated integration checks: migrations, RPC permissions, price
  rounding/overrides, existing/new customers, maintenance vs public availability,
  blocked dates, overlap rejection, transaction rollback after customer upsert,
  and simultaneous overlapping bookings (exactly one booking/customer survives).
- Swift 6 Debug and Release app/widget/notification builds; simulator build.
- Swift compatibility/multipart/photo checks: old detail payloads, date formats,
  JSON round trips, binary multipart integrity, 1600px JPEG output, GPS stripping.
- Signed Debug bundle checked for icons, privacy resources, matching versions,
  team identifier and the development APNs entitlement. Installed and launched on
  the connected iPhone 14 Plus. Operator sign-in still needs confirmation.
- Simulator sign-in screen inspected in light mode and dark mode at the largest
  accessibility text size; fixed text clipping with wrapping and scrolling.

## Fixed during device testing

Copied Debug/Release config overrides contained `SUPABASE_HOST = https://…`,
which xcconfig truncated to `https:`. Corrected to the bare hostname, removed
blank development-team overrides, added URL validation and bundle checks.
Sign-in verifies admin access through the established summary endpoint so it
works while the deployed server does not yet have the new meta endpoint.

## Not released / remaining external checks

- Apply migration 0009 to project `xqsaaqzooxmsikqgpfgb` and deploy the new server
  code. The currently logged-in Supabase CLI account lists other projects, not
  this one. Production `/api/ops/meta` currently returns 404.
- Set Vercel's APNS_ENVIRONMENT fallback to production; device-specific routing
  already handles sandbox and production together.
- Provide the ASC App Manager API key path, Key ID and Issuer ID, then verify the
  ASC record, privacy questionnaire, distribution profiles and upload. No
  TestFlight upload or tester invitation has been performed.
- Run authenticated mutation/409/media smoke checks against staging and complete
  physical-device camera, widget, cold/warm push, sign-out unregistration and
  cross-surface verification. New feature screens need the deployed APIs.
- TestFlight clean-device production-push acceptance and friend testing remain.

See README.md for commands and setup. The source changes are uncommitted for review.
