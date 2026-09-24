# JH Ops implementation / release status

Updated 24 September 2026.

## Implemented

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

- 177 Vitest tests; ESLint; Next.js production build, including international
  phone formatting and exact 48-hour pricing regressions.
- 88 live production HTTP checks: missing and garbage tokens rejected across all
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

## TestFlight upload

- App Store Connect record: [JH Ops](https://appstoreconnect.apple.com/apps/6815660759),
  bundle ID/SKU `in.jhselfdrive.ops`, English (U.K.).
- Version **1.1 (24)** archived from commit `0b4592a` and uploaded successfully
  on 24 September 2026 at 18:13 IST using the existing Xcode Apple account.
  Xcode reported `Upload succeeded` and `EXPORT SUCCEEDED`.
- Distribution IPA: `ios/build/export-24/JHOps.ipa`. Signature, production APNs,
  three matching versions, icons and privacy manifests verified on the exported
  package. Automatic signing uses development entitlements in the archive and
  re-signs with production entitlements during App Store export.
- Release script now supports either the signed-in Xcode account or an API key,
  and verifies the distribution IPA before uploading.
- Internal group `internal` exists. Processing completion and assignment of the
  build and account-holder tester still need confirmation in App Store Connect.

## Remaining external checks

- Migrations 0009 and 0010 and the server changes are deployed. All 44 admin
  route/method pairs now reject unauthenticated requests with 401 rather than 404.
- App privacy, review metadata and public App Store submission are not complete;
  this release is for TestFlight testing.
- Run authenticated mutation/409/media smoke checks against staging and complete
  physical-device camera, widget, cold/warm push, sign-out unregistration and
  cross-surface verification. New feature screens need the deployed APIs.
- TestFlight clean-device production-push acceptance and friend testing remain.

See README.md for commands and setup. Release-script and documentation updates
remain uncommitted for review; the uploaded app sources are committed.
