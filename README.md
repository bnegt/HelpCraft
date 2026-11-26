# HelpCraft

Playwright against [CamCraft](https://github.com/NeoTech/Camcraft)'s browser build, in Docker:
build any branch or PR to wasm, serve it, and drive it from a headless Chromium. Either Claude
drives it by hand (Playwright MCP), or scripted Playwright tests do.

![CamCraft main running in the container](docs/camcraft-in-docker.png)

Help movie, recorded by `tests/help-contour.spec.ts`: [how to make a contour toolpath](docs/help/contour-path.mp4) (1:33).

## Pieces (`docker-compose.yml`)

| service | what it does |
|---|---|
| `build` | `docker compose run --rm build NeoTech/Camcraft main` (or `pr:4009`, or a branch). Runs CamCraft's own `web/build-app-wasm.sh --release` + `check-app-page.sh`, writes `out/<slug>/`. The source and cargo registry sit in volumes, so later builds are incremental. |
| `web` | serves `out/` at `http://localhost:8090/<slug>/` |
| `mcp` | Playwright MCP (with vision/coordinate tools) on `http://localhost:8931/mcp`, registered for Claude Code in `.mcp.json` |
| `test` | `docker compose run --rm test` runs the Playwright suite in `tests/` (`BASE_URL` picks the build) |

```sh
docker compose run --rm build NeoTech/Camcraft main   # first build is slow (full workspace to wasm)
docker compose up -d web mcp
docker compose run --rm test                          # suite against out/main
scripts/test-pr.sh 4009                               # build pr:4009, run the suite against it, summarise
scripts/compare-pr.sh 4009                            # same steps on main and pr-4009: before | after | diff
scripts/help-movie.sh                                 # record the "how to make a contour toolpath" help movie
```

`compare-pr.sh` writes `out/compare/pr-N/{before,after,diff}/` and an `index.html`, served at
`http://localhost:8090/compare/pr-N/`. It prints a per-step summary (`identical`, `N px differ`).

## Tests (`tests/`)

| spec | what |
|---|---|
| `smoke.spec.ts` | status reaches `running`, WebGPU present, canvas not one flat colour, no panics |
| `dovetail.spec.ts` | Camcraft#4004: a dovetail cutter has a Corner radius that keeps its value and changes the drawing. Fails on main (expected failure there via `test.fail`), passes on PR #4009. Finds the label by itself: the row that changes from End mill to Ball nose |
| `help-contour.spec.ts` | not a test: a captioned how-to video of making a contour toolpath, with a drawn cursor; `scripts/help-movie.sh` writes `out/help/contour-path.webm` (and `.mp4` with ffmpeg on the host). Runs only with `HELP_MOVIE=1` |
| `compare.spec.ts`, `calibrate.spec.ts` | not tests: capture for `compare-pr.sh`, and calibration shots (below); skipped unless `CAPTURE_DIR` / `CALIBRATE` is set |
| `contour.spec.ts` | manus 1: import `fixtures/first-part.obj`, fit stock, add a 6 mm end mill, outside contour on the bottom edge loop, generate; a baseline screenshot per step. manus 1b: Post, catch the `download`, and check the G-code ring is the part's outline offset by the tool radius, with no gouges and full depth |

Coordinates live only in `tests/lib/coords.ts` (helpers in `tests/lib/camcraft.ts`, flows in `tests/lib/flows.ts`).

### When CamCraft's layout moves

1. **See what broke.** `docker compose run --rm -e CALIBRATE=1 test npx playwright test calibrate` saves,
   before every click, a screenshot with a crosshair and the coordinate's `coords.ts` name, in the state it
   is clicked in: `tests/test-results/calibrate/<flow>/NN-<name>.png`. Leaf through; the first one off target
   is where to start. A failing spec's `test-results/*/test-failed-1.png` and trace say the same.
2. **Re-find the points with Claude and the MCP** (`docker compose up -d web mcp`). Ask, for example:
   *"Open http://localhost:8090/main/ with the Playwright MCP, walk the contour flow in `tests/lib/flows.ts`
   step by step with screenshots, and give me new coordinates for every point in `tests/lib/coords.ts` that
   no longer lands on its control. Change only coords.ts."* Fixtures for the file chooser are at
   `/tmp/.playwright-mcp/fixtures/` inside the MCP container. Prefer stable handles: filter lists to one row,
   scroll lists to an end, press Frame before clicking geometry.
3. **Re-run calibrate** and check the shots, then the specs.
4. **Refresh baselines** only once the flow is right again, and look at what changed before committing:
   `docker compose run --rm test npx playwright test --update-snapshots`, then `git diff --stat tests/*-snapshots`.
The MCP container sees `tests/fixtures/` at `/tmp/.playwright-mcp/fixtures/` (its only allowed upload
root besides the project path), and saves downloads such as `program.nc` in `/tmp/.playwright-mcp/`.

## Things found the hard way

- **The GPU is required.** CamCraft draws with wgpu. In Chromium in Docker:
  - SwiftShader WebGPU (`--use-webgpu-adapter=swiftshader`) starts at 60 fps but every screenshot
    and canvas readback is plain white;
  - SwiftShader WebGL2 makes CamCraft panic: `create_render_pipeline 'viewport3d-wide'`:
    *"The selected version doesn't support Features(NOPERSPECTIVE_QUALIFIER)"* (an upstream bug
    in the WebGL2 fallback);
  - so `/dev/dri` is passed in and Chromium runs WebGPU on Vulkan (Mesa, Intel Arc/UHD).
    `RENDER_GID`/`VIDEO_GID` in `.env` (copy `.env.example`) are the host's `render`/`video` group ids.
- The `test` container runs as `HOST_UID`/`HOST_GID` (from `.env`), so `tests/node_modules` and
  the reports stay owned by you. `tests/smoke.spec.ts` checks the status div reaches `running`,
  WebGPU is present, the canvas isn't one flat colour, and the console has no panics.
- **The build image copies CamCraft's CI** (the `wasm` job in `.github/workflows/release.yml`: clang-18/llvm-18,
  stable Rust, wasm32). `docker/wasm-job.snapshot.yml` is that job as copied (comments dropped); `build` prints a
  yellow WARNING with a diff when the ref it builds has a different job. Then bring `docker/build.Dockerfile`
  in line, run `scripts/update-wasm-snapshot.sh` and `docker compose build build`.
- egui draws everything on one `<canvas>`, so there is no DOM to select: clicks go by coordinates
  at a fixed 1440x900 viewport. Useful DOM hooks: `#camcraft-status[data-state]`
  (`running`/`refused`), console output, and the `<input type=file>` the app opens to import models.
- The catalog's EM-0600-4FL has 15 mm of flute under an 8 mm shank: on the 15 mm plate (17 mm
  below the fitted stock top) Post refuses with shank collisions, so the test sets the flute to 25 mm.
- The status bar text isn't in the console or the DOM; asserting on it means pixels.
- Host networking is used throughout (localhost only). Port 8080 is often taken; this uses 8090.
