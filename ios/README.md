# JH Ops — iOS app and home-screen widget

Booking requests pushed to your phone, with a widget showing what needs
attention. Talks to the `/api/ops` routes in the Next.js app.

```
JHOps/        SwiftUI app — login, request list, booking detail, transitions
JHOpsWidget/  WidgetKit extension — the home-screen tile
JHOpsNotify/  Notification service extension — refreshes the widget on push
Shared/       Config, API client, models, App Group store, Keychain
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
| Requests, approve/decline, WhatsApp | yes | yes |
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
| `APNS_ENVIRONMENT` | `sandbox` for Xcode builds, `production` for TestFlight |
| `OPS_CRON_SECRET` | `openssl rand -hex 32` |

`APNS_ENVIRONMENT` must match how the app was built. A debug build from Xcode
gets a **sandbox** token; sending it to the production host fails with
`BadDeviceToken`, which is the single most common cause of "push does nothing".

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
