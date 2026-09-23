#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-full}" in
  free) xcodegen --spec project-free.yml >/dev/null ;;
  full) xcodegen >/dev/null ;;
  *) echo 'Usage: verify.sh [full|free]'; exit 1 ;;
esac
CONFIGURATION=${CONFIGURATION:-Debug}
DERIVED_DATA=${DERIVED_DATA:-"$PWD/build/verify"}
BUILD=${BUILD:-$(git rev-list --count HEAD)}
# Unsigned device builds exercise all three targets without a distribution key.
xcodebuild -project JHOps.xcodeproj -scheme JHOps -destination 'generic/platform=iOS' \
  -configuration "$CONFIGURATION" -derivedDataPath "$DERIVED_DATA" \
  CURRENT_PROJECT_VERSION="$BUILD" CODE_SIGNING_ALLOWED=NO build >"${TMPDIR:-/tmp}/jh-ops-verify.log" 2>&1 || {
  tail -80 "${TMPDIR:-/tmp}/jh-ops-verify.log"; exit 1;
}
APP="$DERIVED_DATA/Build/Products/$CONFIGURATION-iphoneos/JHOps.app"
./verify-bundle.sh "$APP" "${1:-full}" unsigned
