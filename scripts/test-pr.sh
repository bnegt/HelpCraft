#!/usr/bin/env bash
# scripts/test-pr.sh N [owner/repo]
# Build CamCraft PR N to out/pr-N/, run the Playwright suite against it, print a summary.
set -uo pipefail
N="${1:?usage: scripts/test-pr.sh N [owner/repo]}"; REPO="${2:-NeoTech/Camcraft}"
cd "$(dirname "$0")/.."
LOG="out/test-pr-$N.log"; mkdir -p out

echo "test-pr: building $REPO pr:$N"
docker compose run --rm build "$REPO" "pr:$N" 2>&1 | tee "out/build-pr-$N.log" | grep -E '^(build-ref|check-app-page|error)'
build=${PIPESTATUS[0]}
if (( build != 0 )); then echo "test-pr: build FAILED (exit $build), see out/build-pr-$N.log"; exit "$build"; fi

docker compose up -d web >/dev/null 2>&1
URL="http://localhost:8090/pr-$N/"
echo "test-pr: testing $URL"
BASE_URL="$URL" docker compose run --rm test 2>&1 | tee "$LOG"
tests=${PIPESTATUS[0]}

commit=$(cut -c1-9 "out/pr-$N/COMMIT" 2>/dev/null || echo '?')
title=$(gh pr view "$N" -R "$REPO" --json title --jq .title 2>/dev/null || true)
echo
echo "==== $REPO#$N ${title:+($title)} @ $commit"
grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' "$LOG" | sed 's/^ */  /'
if (( tests == 0 )); then echo "  result: PASS"; else echo "  result: FAIL (exit $tests) - report: tests/playwright-report/index.html"; fi
exit "$tests"
