# JH Ops — iOS app and home-screen widget

Five native tabs for Today, Bookings, Calendar, Fleet and Customers, plus
a home-screen widget and push deep links. All operations use the authenticated
`/api/ops` JSON API; the app never reads PostgREST directly.

```
JHOps/        App/, API/, Models/, DesignSystem/, Features/, Resources/
JHOpsWidget/  WidgetKit extension — the home-screen tile
JHOpsNotify/  Notification service extension — refreshes the widget on push
Shared/       Config, stateless HTTP/auth, summary, App Group store, Keychain
```

## Two build tiers

A free **Personal Team** supports neither **Push Notifications** nor **App
Groups**. App Groups is what lets the widget read the signed-in session, so on a
free Apple ID *both* headline features are unavailable — Xcode refuses to create
a provisioning profile at all.

| | Free Personal Team | Paid Developer Program |
|---|---|---|
| Spec | `xcodegen --spec project-free.yml` | `xcodegen` |
| App on home screen | yes | yes |
| Bookings, money, handovers, fleet, calendar, customers | yes | yes |
| Push notifications | **no** | yes |
| Home-screen widget | **no** | yes |
| Profile lifetime | 7 days, re-sign weekly | 1 year |

The source is identical between the two — only the spec differs. `TokenStore`
falls back to the app's private keychain when App Groups is not entitled, so
nothing needs changing in code when you upgrade. Re-run `xcodegen` with the full
spec and the widget and push come with it.

## One-time Apple setup (paid tier only)

Push notifications need a **paid Apple Developer account**. A free Apple ID
cannot use APNs at all, and its provisioning profiles expire after 7 days.

1. Enrol at <https://developer.apple.com/programs/> (~$99/yr).
2. **Identifiers** → new App ID `in.jhselfdrive.ops`, enable **Push
   Notifications** and **App Groups**. Repeat for `in.jhselfdrive.ops.widget`
   and `in.jhselfdrive.ops.notify` (App Groups only).
3. **Identifiers → App Groups** → new group `group.in.jhselfdrive.ops`, and add
   all three App IDs to it.
4. **Keys** → new key with **APNs** enabled. Download the `.p8` **once** — Apple
   will not let you download it again. Note the Key ID, and your Team ID from
   the top right of the portal.

## Server environment

Set these in Vercel (and `.env` locally). See `.env.example`.

| Variable | Value |
|---|---|
| `APNS_KEY_P8` | the whole `.p8` file contents |
| `APNS_KEY_ID` | the 10-character Key ID |
| `APNS_TEAM_ID` | your 10-character Team ID |
| `APNS_BUNDLE_ID` | `in.jhselfdrive.ops` |
| `APNS_ENVIRONMENT` | `production` as the fallback default |
| `OPS_CRON_SECRET` | `openssl rand -hex 32` |

Every device registers its own environment: Debug uses sandbox and Release
uses production. `notifyAdmins` groups devices by that value and selects the
matching APNs host. Both can coexist; `APNS_ENVIRONMENT` is only a fallback.
Set the Vercel default to `production`. Replacing a debug installation with
TestFlight eventually produces a 410 for the old token, which is pruned.

## Build

```sh
brew install xcodegen                      # once
cp Config.example.xcconfig Config.xcconfig # once, then fill it in
xcodegen --spec project-free.yml           # free team: app only
# xcodegen                                 # paid team: app + widget + push
open JHOps.xcodeproj
```

**Set `DEVELOPMENT_TEAM` in `Config.xcconfig`**, not just in the Xcode UI. The
UI sets it on one target only, which is why the widget and notification
extension report "requires a development team".

> **Getting the Team ID right.** A signing certificate carries *two* different
> 10-character codes, and only one of them is the Team ID:
>
> ```
> subject= CN=Apple Development: Your Name (X82C6JW39S), OU=NQW9XD522R, ...
> #                                         not this        this one
> ```
>
> The Team ID is the **OU** field. Read it with:
>
> ```sh
> security find-identity -v -p codesigning
> security find-certificate -c "<identity from above>" -p | openssl x509 -noout -subject
> ```
>
> Using the parenthetical code instead matches no real team, so Xcode quietly
> falls back to the free Personal Team and then refuses to build with
> *"Personal development teams … do not support the Push Notifications
> capability"* — an error that points at the capability rather than the actual
> cause.

`Config.xcconfig` holds two **hostnames**, the Supabase publishable key (both
hosts and the key are already public in the website bundle) and your
`DEVELOPMENT_TEAM`. It is gitignored; `Config.example.xcconfig` is the template.

> **Hostnames, not URLs.** `//` begins a comment in an xcconfig file, so a
> pasted `https://x.supabase.co` is silently truncated to `https:` and the app
> gets an unusable base URL. The config therefore stores `x.supabase.co` and
> the scheme is added in `OpsConfig`.

`JHOps.xcodeproj` is **generated and gitignored** — edit `project.yml`, not the
project file, and re-run `xcodegen`.

Select your team under Signing & Capabilities for all three targets, then build
to your iPhone. Sign in with the same account as the web admin panel — the API
checks the same `admin_users` allowlist, so a Supabase login alone is not
enough.

Long-press the home screen → **Edit** → **Add Widget** → JH Ops.

## Verify

```sh
./verify.sh free    # or: ./verify.sh full
./test-models.sh    # decoding, multipart, downscaling, GPS stripping
```

Builds and then asserts the produced bundle is actually installable.
**"BUILD SUCCEEDED" is not sufficient** — a bundle whose `Info.plist` lacks
`CFBundleIdentifier` compiles cleanly and then fails on the device with
*"not a valid bundle"*. The script checks those keys, and that the hostnames
survived the xcconfig, for the app and both extensions.

This is why the Info.plists are generated by XcodeGen from `project.yml` rather
than hand-written: the required bundle keys are then always present. Do not add
`Info.plist` files by hand — they are overwritten on every `xcodegen` run.

## Notes

- **Session sharing.** Tokens live in the Keychain under the App Group access
  group, not the app's private keychain. That is what lets the widget
  authenticate; a privately stored token leaves it permanently blank.
  The Keychain wants that group **team-prefixed**
  (`<TeamID>.group.in.jhselfdrive.ops`), because a provisioning profile only
  ever grants `<TeamID>.*`. So the entitlements say
  `$(AppIdentifierPrefix)group.in.jhselfdrive.ops` and `OpsConfig.keychainGroup`
  rebuilds the same string at runtime from the team injected into Info.plist.
  A bare app-group name there fails at codesign with *"doesn't match the
  entitlements file's value for the keychain-access-groups entitlement"*.
- **Widget freshness.** WidgetKit allows only ~40–70 timeline refreshes a day,
  so polling cannot keep the widget current. Each push carries the new counts
  and `JHOpsNotify` writes them to the App Group store and reloads the
  timeline — that is what makes the widget update the instant a request lands.


## Publishing to TestFlight

The full paid spec uses team `NQW9XD522R`. Complete these account steps once:

1. The [JH Ops app record](https://appstoreconnect.apple.com/apps/6815660759)
   uses bundle ID and SKU `in.jhselfdrive.ops`, with English (U.K.) as its
   primary language. Reuse this record for subsequent uploads.
2. Verify Push Notifications + App Groups on the app ID, and App Groups on
   `.widget` and `.notify`, all using `group.in.jhselfdrive.ops`.
3. For local releases, sign in to the paid team in Xcode → Settings → Accounts.
   For automation, use an App Manager key from Users and Access → Integrations
   → App Store Connect API. Save the once-downloadable key at
   `~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`. An APNs key is a
   different credential and cannot upload builds. Keep private keys out of git.
4. Fill App Privacy to match `Resources/PrivacyInfo.xcprivacy`: no tracking;
   email, phone, name, and photos used for app functionality and linked to the
   person. UserDefaults reasons CA92.1 and 1C8F.1 cover the app-group suite and
   the standard-defaults fallback. Keychain needs no required-reason declaration.
5. Configure Test Information and a support contact. For external review,
   provide a real, dedicated login on the `admin_users` allowlist. A Supabase
   account alone cannot enter the app.

From `ios/`, after committing the release sources:

```sh
# Uses your signed-in Xcode account by default.
./release.sh
# For API-key authentication, set ASC_KEY_ID and ASC_ISSUER_ID first.
# Optional: ASC_KEY_PATH=/absolute/path/to/AuthKey_YOUR_KEY_ID.p8
```

The script generates the full project, gates on a Release verification build,
archives with automatic provisioning, exports and verifies a distribution IPA,
then uploads through Xcode. A development-signed archive is normal: App Store
export re-signs it with distribution profiles and production APNs. The production
entitlement check therefore runs on the exported IPA. The account must have rights
to create the Apple Distribution certificate and three App Store profiles.
Confirm the resulting certificate with `security find-identity -v -p codesigning`.
No fastlane or separate `altool` is required; if export upload is unavailable,
Xcode Organizer or `xcrun altool --upload-app --type ios --file <ipa> --apiKey
<key-id> --apiIssuer <issuer-id>` is a fallback, not the normal path.

`MARKETING_VERSION` lives in the ignored `Config.xcconfig` (example: `1.1`).
Increment it for a feature release. `CURRENT_PROJECT_VERSION` defaults to the
commit count, passed on the command line. Release from a linear mainline so the
count never goes backwards; an explicit higher `BUILD` is available when the
account has already used a number. Never reuse an uploaded version/build pair.
All three generated plists map both version build settings explicitly. App and
extension mismatch causes ITMS-90473; `verify-bundle.sh` fails before upload.

`Config.debug.xcconfig` includes the local config and selects
`APS_ENVIRONMENT=development`; `Config.release.xcconfig` selects `production`.
Do not edit the entitlements to switch environments. This setting must remain
aligned with App/AppDelegate's `#if DEBUG` registration branch. An unsigned compile
cannot prove the signed entitlement; release.sh checks it on the exported IPA with
`codesign`. Exempt encryption is declared in all three generated plists.

Regenerate the icon from the repository root with
`node scripts/generate-app-icon.mjs`. The icon is a single 1024×1024, sRGB,
opaque PNG, without rounded corners. Verify with:

```sh
sips -g hasAlpha JHOps/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png
# must report: hasAlpha: no
```

After processing, add the build to an internal testing group. Internal testing
supports up to 100 App Store Connect users and does not require Beta App Review.
For the first friend, add an ASC user with Developer access and add them to that
group; they also need their own Supabase login on `admin_users`. External email
or public-link testing supports up to 10,000 people but requires Beta App Review
for the first build of each version. Allow review time and provide the demo login.

## Server rollout and contract checks

Apply migrations `0009_admin_bookings.sql` and `0010_international_customer_phones.sql` to the correct site project
before deploying the server and distributing this app. It introduces an atomic
customer-upsert + booking-insert RPC with a vehicle row lock. Admin availability
now includes maintenance vehicles; public availability still requires an active,
bookable vehicle. Migration 0010 allows international customer phone numbers.
Completed rentals continue to reserve their historical dates.
Existing `/api/ops/requests` and the original booking-detail keys remain intact.

From the repository root:

```sh
npm run test && npm run lint && npm run build
./scripts/test-admin-bookings.sh # local, disposable PostgreSQL 17; PG_BIN overrides its path
npm run dev
# In another terminal:
./scripts/ops-smoke.sh
```

The smoke script discovers every ops route/method and checks 401 without a
header and with a garbage token. Set `OPS_SMOKE_ADMIN_EMAIL`,
`OPS_SMOKE_ADMIN_PASSWORD`, `OPS_SMOKE_NONADMIN_EMAIL`, and
`OPS_SMOKE_NONADMIN_PASSWORD` to add password-grant 403 tests, authenticated
reads, and malformed-body tests. Existing bearer tokens can instead be passed
in `OPS_SMOKE_ADMIN_TOKEN` and `OPS_SMOKE_NONADMIN_TOKEN`. Tokens are never logged.
`OPS_SMOKE_URL` defaults to localhost; set it explicitly for staging.

Mutating tests require `OPS_SMOKE_MUTATIONS=1` and `OPS_SMOKE_FIXTURES`, a JSON
file of disposable fixture requests: `{ "method": "POST", "path":
"/api/ops/…", "body": {…}, "expected": [200] }`. Include conflict cases with
expected `[409]`. Do not use operational bookings as disposable fixtures.
The unit suite additionally verifies media compensation on occupied licence
slots, HEIC rejection, error redaction, admin gating, and calendar packing.

Photos are JPEG-encoded at 1600px, quality 0.7, retried at 0.5 above 1.5 MB,
and rejected above 3.5 MB. One file is posted at a time, and failed data stays
in the sheet for Retry. Vehicle documents are capped at 4 MB; use the web panel
for larger files. The server derives restricted/public buckets from media type.

Only Today counts, booking lists, fleet lists, customers, and meta are cached
as protected files in the App Group. Detail and calendar always load live.
Writes are never queued offline. Successful mutations refresh sibling tabs and
invalidate the web panel. `/api/ops/meta` provides option labels and
`OPS_MIN_APP_BUILD` lets the server require a newer installed build.

## Device acceptance before inviting testers

- Simulator: point `OPS_API_SCHEME=http` and `OPS_API_HOST=<mac-ip>:3000` at the
  new server. Check every tab, empty/error states, dark mode, and largest text.
- Debug device: check camera → JPEG → upload, one repeated licence-slot 409,
  payments, handovers, and the corresponding web-panel state after each mutation.
- Verify the widget populates after login and that notification taps from cold
  start and background select a single booking detail instead of stacking copies.
- Clean TestFlight install: sign in, receive a production push, open its booking,
  sign out, and confirm the device is removed from `admin_devices`. Repeat with
  the friend’s account and one approval.

A passing unsigned build is not a TestFlight upload or a physical-device push test.

For real media checks, also set `OPS_SMOKE_MEDIA_BOOKING_ID` to a disposable
booking with an empty delivery licence-front slot. The smoke script tests HEIC
400, 5 MB 413, duplicate slot 409, compares restricted bucket contents to detect
orphan uploads, and deletes its own successful upload in `finally`.
