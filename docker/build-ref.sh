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
bash web/build-app-wasm.sh --release
bash web/check-app-page.sh target/web
rm -rf "/out/$SLUG"; cp -r target/web "/out/$SLUG"
git rev-parse HEAD > "/out/$SLUG/COMMIT"
chown -R "${HOST_UID:-1000}:${HOST_GID:-1000}" "/out/$SLUG"
echo "build-ref: done -> out/$SLUG/ (serve: http://localhost:8090/$SLUG/)"
