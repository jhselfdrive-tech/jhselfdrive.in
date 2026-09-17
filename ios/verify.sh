#!/usr/bin/env bash
# Builds the iOS app and checks the produced bundle is actually installable.
#
# "BUILD SUCCEEDED" is not enough: a bundle whose Info.plist lacks
# CFBundleIdentifier compiles fine and then fails on the device with
# "not a valid bundle", so the keys are asserted here.
#
#   ./verify.sh          # whichever spec is currently generated
#   ./verify.sh free     # regenerate the free spec first
#   ./verify.sh full     # regenerate the full spec first
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  free) xcodegen --spec project-free.yml >/dev/null; echo "spec: free (app only)" ;;
  full) xcodegen >/dev/null; echo "spec: full (app + widget + push)" ;;
  *)    echo "spec: as generated" ;;
esac

xcodebuild -project JHOps.xcodeproj -scheme JHOps \
  -destination 'generic/platform=iOS' -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build 2>&1 |
  grep -E "error:|warning:|BUILD SUCCEEDED|BUILD FAILED"

APP=$(find ~/Library/Developer/Xcode/DerivedData/JHOps-*/Build/Products/Debug-iphoneos \
  -maxdepth 1 -name "JHOps.app" | head -1)
[ -n "$APP" ] || { echo "FAIL: no built app found"; exit 1; }

failed=0
check() { # bundle, key
  value=$(plutil -extract "$2" raw "$1/Info.plist" 2>/dev/null || true)
  if [ -z "$value" ]; then
    echo "  FAIL $(basename "$1"): $2 is missing"
    failed=1
  else
    printf "  ok   %-20s %-24s %s\n" "$(basename "$1")" "$2" "$value"
  fi
}

echo "Bundle checks:"
for bundle in "$APP" "$APP"/PlugIns/*.appex; do
  [ -d "$bundle" ] || continue
  check "$bundle" CFBundleIdentifier
  check "$bundle" CFBundleExecutable
  check "$bundle" CFBundlePackageType
done

# A URL pasted into an xcconfig gets truncated at "//", so assert the hosts
# survived as real hostnames.
for key in OPS_API_HOST SUPABASE_HOST; do
  value=$(plutil -extract "$key" raw "$APP/Info.plist" 2>/dev/null || true)
  case "$value" in
    ""|*:*|*/*) echo "  FAIL $key looks wrong: '$value' (want a bare hostname)"; failed=1 ;;
    *)          printf "  ok   %-20s %-24s %s\n" "JHOps.app" "$key" "$value" ;;
  esac
done

[ "$failed" -eq 0 ] && echo "All bundle checks passed." || { echo "Bundle checks FAILED."; exit 1; }
