#!/usr/bin/env bash
# scripts/compare-pr.sh N [base-slug]   (base defaults to main)
# Run the same UI steps on out/<base>/ and out/pr-N/ and write
# out/compare/pr-N/{before,after,diff}/*.png and index.html.
# Builds pr-N first if out/pr-N/ doesn't exist (scripts/test-pr.sh N rebuilds it).
set -uo pipefail
N="${1:?usage: scripts/compare-pr.sh N [base-slug]}"; BASE="${2:-main}"
cd "$(dirname "$0")/.."
OUT="out/compare/pr-$N"
for slug in "$BASE" "pr-$N"; do
  if [[ ! -f out/$slug/index.html ]]; then
    ref=$([[ $slug == pr-* ]] && echo "pr:$N" || echo "$slug")
    echo "compare-pr: building $ref"
    docker compose run --rm build NeoTech/Camcraft "$ref" 2>&1 | grep -E '^(build-ref|error)' || exit 1
  fi
done
docker compose up -d web >/dev/null 2>&1
rm -rf "$OUT"; mkdir -p "$OUT"
for side in before after; do
  slug=$([[ $side == before ]] && echo "$BASE" || echo "pr-$N")
  echo "compare-pr: capturing $side ($slug)"
  BASE_URL="http://localhost:8090/$slug/" docker compose run --rm -e CAPTURE_DIR="/out/compare/pr-$N/$side" \
    -v "$PWD/out:/out" test bash -c "npm ci --no-audit --no-fund >/dev/null && npx playwright test compare --reporter=line" 2>&1 | grep -E '✘|passed|failed|Error' || true
done
title="NeoTech/Camcraft#$N vs $BASE ($(cut -c1-9 out/pr-$N/COMMIT 2>/dev/null) vs $(cut -c1-9 out/$BASE/COMMIT 2>/dev/null))"
docker compose run --rm -v "$PWD/out:/out" test node --experimental-strip-types lib/report.mts \
  "/out/compare/pr-$N/before" "/out/compare/pr-$N/after" "/out/compare/pr-$N" "$title" 2>&1 | grep -v -E 'ExperimentalWarning|--trace-warnings|^ Container|npm notice'
echo "compare-pr: open http://localhost:8090/compare/pr-$N/"
