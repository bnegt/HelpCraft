#!/usr/bin/env bash
# Record the PCBCraft manus help movies (docs/manus/pcbcraft/) from the real desktop UI.
# Each manus runs in a fresh helpcraft-pcbcraft-rec container: Xvfb, the PCBCraft desktop app with
# --control, pcbcraft-movies/movie.py driving it, ffmpeg x11grab recording, burn.py adding captions.
# Manus N starts from the design manus N-1 saved, so they run in order.
#
#   scripts/pcbcraft-movies.sh [1 2 3 4]     # default: all four
# Needs: PCBCRAFT_BIN (default ~/pcbcraft/target/debug) with pcbcraft + pcbcraft-cli built.
# Writes: docs/help/pcbcraft-manus-N-*.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=${PCBCRAFT_BIN:-$HOME/pcbcraft/target/debug}
WORK=${WORK:-$PWD/out/pcbcraft-movies}
mkdir -p "$WORK" docs/help
docker image inspect helpcraft-pcbcraft-rec >/dev/null 2>&1 ||
  docker build --network host -t helpcraft-pcbcraft-rec -f docker/pcbcraft-rec.Dockerfile docker

declare -A NAME=([1]=board-outline [2]=schematic-nets [3]=placement-routing [4]=fabrication)
declare -A OPEN=([1]="" [2]="--project /work/stage1.pcbcraft --tab schematic"
                 [3]="--project /work/stage2.pcbcraft --tab pcb" [4]="--project /work/stage3.pcbcraft --tab pcb")

for n in "${@:-1 2 3 4}"; do
  for m in $n; do
    echo "== manus $m: ${NAME[$m]}"
    docker run --rm --network none -u "$(id -u):$(id -g)" -e HOME=/tmp -e RUST_MIN_STACK=268435456 \
      -v "$BIN":/opt/pcbcraft:ro -v /usr/share/kicad:/usr/share/kicad:ro -v "$PWD/pcbcraft-movies":/movies:ro -v "$PWD":/repo:ro \
      -v "$WORK":/work -v "$PWD/docs/help":/out \
      helpcraft-pcbcraft-rec bash -c "
        Xvfb :99 -screen 0 1600x1000x24 >/dev/null 2>&1 & sleep 1; export DISPLAY=:99
        /opt/pcbcraft/pcbcraft --control 127.0.0.1:7992 --size 1600x1000 ${OPEN[$m]} > /work/app-$m.log 2>&1 &
        cd /movies && python movie.py $m /work/manus$m &&
        python burn.py /work/manus$m /out/pcbcraft-manus-$m-${NAME[$m]}.mp4"
  done
done
