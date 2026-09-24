#!/usr/bin/env bash
# One command: verified Release bundle -> signed archive -> TestFlight upload.
set -euo pipefail
cd "$(dirname "$0")"
# Use the signed-in Xcode account locally, or an explicit API key in automation.
AUTH=(-allowProvisioningUpdates)
if [ -n "${ASC_KEY_ID:-}${ASC_ISSUER_ID:-}${ASC_KEY_PATH:-}" ]; then
  : "${ASC_KEY_ID:?Set ASC_KEY_ID with the API key}"
  : "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID with the API key}"
  ASC_KEY_PATH=${ASC_KEY_PATH:-"$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"}
  [ -f "$ASC_KEY_PATH" ] || { echo "Missing API key: $ASC_KEY_PATH"; exit 1; }
  AUTH+=(-authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
fi
[ -f Config.xcconfig ] || { echo 'Copy Config.example.xcconfig to Config.xcconfig first.'; exit 1; }
# A commit-count build must describe committed sources, otherwise it is not reproducible.
[ -z "$(git status --porcelain)" ] || { echo 'Commit changes before releasing (build number is the commit count).'; exit 1; }
export BUILD=${BUILD:-$(git rev-list --count HEAD)}
[[ "$BUILD" =~ ^[1-9][0-9]*$ ]] || { echo 'BUILD must be a positive integer'; exit 1; }
export CONFIGURATION=Release
xcodegen >/dev/null
./test-models.sh
./verify.sh full
ARCHIVE="$PWD/build/JHOps-$BUILD.xcarchive"
xcodebuild -project JHOps.xcodeproj -scheme JHOps -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  CURRENT_PROJECT_VERSION="$BUILD" "${AUTH[@]}" archive
./verify-bundle.sh "$ARCHIVE/Products/Applications/JHOps.app" full archive
# Automatic signing may use development entitlements in the archive. App Store
# export re-signs it; production APNs must be checked on that distribution IPA.
CHECK_DIR=$(mktemp -d /tmp/jh-ops-export.XXXXXX)
trap 'rm -rf "$CHECK_DIR"' EXIT
cp ExportOptions.plist "$CHECK_DIR/ExportOptions.plist"
/usr/libexec/PlistBuddy -c 'Set :destination export' "$CHECK_DIR/ExportOptions.plist"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$CHECK_DIR/ExportOptions.plist" \
  -exportPath "$PWD/build/export-$BUILD" "${AUTH[@]}"
ditto -x -k "$PWD/build/export-$BUILD/JHOps.ipa" "$CHECK_DIR/unpacked"
EXPECTED_APS=production ./verify-bundle.sh "$CHECK_DIR/unpacked/Payload/JHOps.app" full signed
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist ExportOptions.plist \
  -exportPath "$PWD/build/upload-$BUILD" "${AUTH[@]}"
echo "Upload submitted. Check processing and assign build $BUILD to the internal testing group in App Store Connect."
