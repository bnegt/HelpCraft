#!/usr/bin/env bash
# scripts/help-movie.sh [slug]   (default main)
# Record the "how to make a contour toolpath" help movie from out/<slug>/:
#   out/help/contour-path.webm, plus .mp4 when ffmpeg is on the host.
set -euo pipefail
SLUG="${1:-main}"; cd "$(dirname "$0")/.."
docker compose up -d web >/dev/null 2>&1
BASE_URL="http://localhost:8090/$SLUG/" docker compose run --rm -e HELP_MOVIE=1 -v "$PWD/out:/out" test \
  bash -c "npm ci --no-audit --no-fund >/dev/null && npx playwright test help-contour --reporter=line" \
  2>&1 | grep -E 'help movie:|passed|failed|Error'
if command -v ffmpeg >/dev/null; then
  ffmpeg -loglevel error -y -i out/help/contour-path.webm -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart out/help/contour-path.mp4
fi
ls -l out/help/
echo "help-movie: http://localhost:8090/help/contour-path.webm"
