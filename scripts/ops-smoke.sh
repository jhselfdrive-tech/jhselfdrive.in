#!/usr/bin/env bash
# API contract smoke. Read-only unless OPS_SMOKE_MUTATIONS=1 and a disposable
# fixture file is supplied. Never points at production by default.
set -euo pipefail
cd "$(dirname "$0")/.."
node --env-file-if-exists=.env scripts/ops-smoke.mjs
