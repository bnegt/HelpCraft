#!/usr/bin/env bash
# wasm-job.sh <release.yml>  -> the `wasm:` job, comments and blank lines dropped.
# Used by build-ref (drift warning) and scripts/update-wasm-snapshot.sh.
set -euo pipefail
awk '
  /^  wasm:[[:space:]]*$/ { f = 1; print; next }
  f && (/^  [A-Za-z0-9_-]+:[[:space:]]*$/ || /^[^[:space:]#]/) { exit }
  f
' "$1" | grep -v -E '^[[:space:]]*(#.*)?$' || true
