#!/usr/bin/env bash
# Also run on the signed archive: unsigned verification cannot prove entitlements.
set -euo pipefail
APP=${1:?Pass an app bundle}
SPEC=${2:-full}
SIGNING=${3:-signed}
fail() { echo "FAIL: $*"; exit 1; }
read_key() { /usr/libexec/PlistBuddy -c "Print :$2" "$1/Info.plist"; }
VERSION=$(read_key "$APP" CFBundleShortVersionString)
BUILD=$(read_key "$APP" CFBundleVersion)
[ -s "$APP/Assets.car" ] || fail 'Missing Assets.car'
read_key "$APP" CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconFiles | grep -q AppIcon60x60 || fail 'Missing AppIcon60x60'
if [ "$SPEC" = full ]; then
  [[ "$(read_key "$APP" DEVELOPMENT_TEAM)" =~ ^[A-Z0-9]{10}$ ]] || fail "Set DEVELOPMENT_TEAM in Config.xcconfig; do not override it with a blank value."
  [ -d "$APP/PlugIns/JHOpsWidget.appex" ] && [ -d "$APP/PlugIns/JHOpsNotify.appex" ] || fail 'Missing extensions'
fi
for bundle in "$APP" "$APP"/PlugIns/*.appex; do
  [ -d "$bundle" ] || continue
  for key in CFBundleIdentifier CFBundleExecutable CFBundlePackageType; do
    [ -n "$(read_key "$bundle" "$key")" ] || fail "Missing $key"
  done
  [ "$(read_key "$bundle" CFBundleShortVersionString)" = "$VERSION" ] || fail 'Marketing version drift'
  [ "$(read_key "$bundle" CFBundleVersion)" = "$BUILD" ] || fail 'Build version drift (ITMS-90473)'
  [ -s "$bundle/PrivacyInfo.xcprivacy" ] || fail "Missing privacy manifest in $bundle"
  plutil -lint "$bundle/PrivacyInfo.xcprivacy" >/dev/null
done
for key in OPS_API_HOST SUPABASE_HOST; do
  value=$(read_key "$APP" "$key")
  if [ "$key" = SUPABASE_HOST ]; then
    [[ "$value" =~ ^[A-Za-z0-9.-]+$ ]] || fail "Invalid $key: use a bare hostname, without https://"
  else
    [[ "$value" =~ ^[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || fail "Invalid $key: use a hostname with an optional numeric port, without a URL scheme"
  fi
done
if [ "$SIGNING" = signed ] && [ "$SPEC" = full ]; then
  EXPECTED_APS=${EXPECTED_APS:-production}
  ENTITLEMENTS=$(mktemp)
  trap 'rm -f "$ENTITLEMENTS"' EXIT
  codesign -d --entitlements :- "$APP" >"$ENTITLEMENTS" 2>/dev/null
  [ "$(/usr/libexec/PlistBuddy -c 'Print :aps-environment' "$ENTITLEMENTS")" = "$EXPECTED_APS" ] || fail 'Wrong APNs environment'
  codesign --verify --deep --strict "$APP"
else
  echo 'Unsigned build: APNs codesign check deferred to the signed archive.'
fi
echo "Bundle verified: $VERSION ($BUILD) — $SPEC, $SIGNING"
