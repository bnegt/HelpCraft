#!/usr/bin/env bash
# scripts/solidcraft-movie.sh
# Record the "make a square body in SolidCraft" help movie (docs/manus/solidcraft-square-body.md):
#   out/help/solidcraft-square-body.webm, plus .mp4 when ffmpeg is on the host.
# Runs against https://solidcraft.io/app, or SOLIDCRAFT_URL.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose run --rm -e HELP_MOVIE=1 -e SOLIDCRAFT_URL="${SOLIDCRAFT_URL:-}" -v "$PWD/out:/out" test \
  bash -c "npm ci --no-audit --no-fund >/dev/null && npx playwright test --project solidcraft --reporter=line" \
  2>&1 | grep -E 'help movie:|passed|failed|Error'
if command -v ffmpeg >/dev/null; then
  ffmpeg -loglevel error -y -i out/help/solidcraft-square-body.webm -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart out/help/solidcraft-square-body.mp4
fi
ls -l out/help/solidcraft-square-body.*
