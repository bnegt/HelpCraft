#!/usr/bin/env bash
# build-ref <owner/repo> <ref|pr:N>  -> /out/<slug>/ (index.html + wasm, ready to serve)
set -euo pipefail
REPO="${1:-NeoTech/Camcraft}"; REF="${2:-main}"
SRC=/src/Camcraft
if [[ ! -d $SRC/.git ]]; then git clone --filter=blob:none "https://github.com/$REPO.git" "$SRC"; fi
cd "$SRC"
git remote set-url origin "https://github.com/$REPO.git"
if [[ $REF == pr:* ]]; then
  N=${REF#pr:}; git fetch --force origin "pull/$N/head:helpcraft-pr-$N"; git checkout --force "helpcraft-pr-$N"; SLUG="pr-$N"
else
  git fetch --force origin "$REF"; git checkout --force FETCH_HEAD; SLUG=$(echo "$REF" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-*$//')
fi
echo "build-ref: $REPO $REF -> $(git rev-parse --short HEAD) as $SLUG"

# Drift check (#9): this image mirrors release.yml's wasm job as it was when copied.
SNAP=/usr/local/share/helpcraft/wasm-job.snapshot.yml
WF=.github/workflows/release.yml
warn() { printf '\e[1;33mbuild-ref: WARNING:\e[0m %s\n' "$*" >&2; }
if [[ ! -f $WF ]]; then
  warn "$WF is missing at this ref; can't check the build image against CamCraft's CI"
elif ! now=$(wasm-job "$WF") || [[ -z $now ]]; then
  warn "no 'wasm' job in $WF at this ref; the build image may not match how CamCraft builds for the browser"
elif ! d=$(diff -u --label "snapshot ($(sed -n '1s/.* at \([0-9a-f]*\).*/\1/p' "$SNAP"))" --label "$WF at this ref" \
             <(grep -v '^#' "$SNAP") <(printf '%s\n' "$now")); then
  warn "release.yml's wasm job differs from the snapshot docker/build.Dockerfile mirrors."
  warn "If the build fails, bring build.Dockerfile in line, then scripts/update-wasm-snapshot.sh:"
  printf '%s\n' "$d" | sed 's/^/build-ref:   /' >&2
fi
bash web/build-app-wasm.sh --release
bash web/check-app-page.sh target/web
rm -rf "/out/$SLUG"; cp -r target/web "/out/$SLUG"
git rev-parse HEAD > "/out/$SLUG/COMMIT"
chown -R "${HOST_UID:-1000}:${HOST_GID:-1000}" "/out/$SLUG"
echo "build-ref: done -> out/$SLUG/ (serve: http://localhost:8090/$SLUG/)"
