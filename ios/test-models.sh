#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
TEST_BIN=$(mktemp -d /tmp/jh-ops-swift.XXXXXX)
trap 'rm -rf "$TEST_BIN"' EXIT
swiftc -swift-version 6 Shared/*.swift JHOps/Models/*.swift JHOps/API/Multipart.swift JHOps/API/Mutation.swift \
  JHOps/Features/Media/ImageDownscaler.swift Tests/ModelChecks.swift -o "$TEST_BIN/model-checks"
"$TEST_BIN/model-checks"
