# Manus: make a square body in SolidCraft

A 50 × 50 mm square sketched on the XY plane and extruded 50 mm: a 50 mm cube.

- Test: [`tests/solidcraft/square-body.spec.ts`](../../tests/solidcraft/square-body.spec.ts), about 17 s
- Help movie: [`docs/help/solidcraft-square-body.mp4`](../help/solidcraft-square-body.mp4) (0:54)
- App: the SolidCraft web build, https://solidcraft.io/app (checked with v0.50.0), or `SOLIDCRAFT_URL`

```sh
docker compose run --rm test npx playwright test --project solidcraft          # the test
scripts/solidcraft-movie.sh                                                     # the movie
```

## How it drives the app

Every action is a real Playwright mouse click or keystroke on the canvas. SolidCraft's
browser API (`window.solidcraft`) is used only to find things and to check results:

- **Where to click:** `ui.handles` names every button by its command id (`button:solid.extrude`,
  `home:new_mm`, `axis_view:home`), `ui.at {plane: "XY"}` gives the plane's screen point, and
  `ui.sketchToScreen` turns sketch millimetres into screen points.
- **What happened:** `ui.inspect` (the open dialog, the active tool, the camera),
  `sketch.inspect` (lines, dimensions, corner points) and `inspect({measure: true})`
  (bodies, faces, bounding box, volume).

So there are no hard-coded pixel positions and no fixed waits. Moving a button in a new
SolidCraft release does not break the manus as long as its command id stays the same.

## The script

| # | Action (what the person does) | Caption in the movie | Check |
| --- | --- | --- | --- |
| 1 | Click **New design** (millimetres) on the Start page | Click **New design** · Millimetres | The Start page is closed |
| 2 | Click **Create Sketch**, then click the **XY** plane | Click **Create Sketch** · then pick the plane to draw on / Click the **XY** plane · the floor of the design | The Create Sketch dialog opened; the sketch's plane is XY |
| 3 | Pick **2-Point Rectangle**, click the first corner at (−25, −25), move toward the opposite corner, type **50**, **Tab**, **50**, **Enter**, then **Esc** | Pick **2-Point Rectangle** · two opposite corners / Click the first corner / Type **50**, **Tab**, **50** and **Enter** · typed sizes win over the mouse | 4 lines, two 50 mm dimensions, 50 mm across in X and Y |
| 4 | Click **Finish Sketch** | Click **Finish Sketch** | No sketch open; the sketch has one profile |
| 5 | Click **Extrude**, type **50**, press **Enter** | Click **Extrude** · the square is the only profile, so it is picked already / Type **50** for the distance / Press **Enter** for OK | The Extrude dialog has profile 0 and distance 50; the dialog closes |
| 6 | Click **Home** beside the axis navigator | Click **Home** beside the axis navigator to see it in 3D | The camera moved |
| 7 | — | Done: a 50 mm cube · Sketch → 2-Point Rectangle 50 × 50 → Finish → Extrude 50 mm · 125,000 mm³ | One closed body, 6 planar faces, bounding box (−25, −25, 0) to (25, 25, 50), volume 125 000 mm³, timeline Sketch + Extrude without errors, no page errors |

## Things learned writing it

- **Wait a frame after Tab.** egui handles a key on its next frame. Text typed straight after
  Tab lands in the old field (50 then 50 became one 5050 mm side). `typeValue` and `press`
  wait for a few animation frames after each key group.
- **Extrude picks the only profile itself.** No click on the square is needed; the check reads
  `profiles: [0]` from the open dialog.
- **Usage statistics are turned off** for the test profile (`ui.prefs {usage_statistics: false}`)
  before the first click, so test runs don't send any.
- **The movie needs the drawn cursor.** The canvas hides the system pointer in recordings, so
  `lib.ts` draws a cursor and click rings as DOM over the canvas, like the CamCraft movie.
  SolidCraft also has its own animated pointer (`ui.agent_cursor`), but it follows the app's own
  `ui.click` input, not Playwright's mouse.
