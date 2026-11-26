#!/usr/bin/env bash
# scripts/update-wasm-snapshot.sh [ref]  (default main)
# Re-copy release.yml's wasm job into docker/wasm-job.snapshot.yml. Do this after
# bringing docker/build.Dockerfile in line with it, then rebuild the image:
#   docker compose build build
set -euo pipefail
REF="${1:-main}"; cd "$(dirname "$0")/.."
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
gh api "repos/NeoTech/Camcraft/contents/.github/workflows/release.yml?ref=$REF" -H "Accept: application/vnd.github.raw" > "$tmp"
sha=$(gh api "repos/NeoTech/Camcraft/commits/$REF" --jq '.sha[0:9]')
{
  echo "# NeoTech/Camcraft .github/workflows/release.yml, job \`wasm\`, at $sha (comments dropped)."
  echo "# build.Dockerfile mirrors this; build-ref warns when the ref it builds differs."
  echo "# Refresh after updating build.Dockerfile: scripts/update-wasm-snapshot.sh"
  bash docker/wasm-job.sh "$tmp"
} > docker/wasm-job.snapshot.yml
git --no-pager diff --stat -- docker/wasm-job.snapshot.yml || true
echo "update-wasm-snapshot: docker/wasm-job.snapshot.yml now matches $REF ($sha)"
