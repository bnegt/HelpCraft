import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  MOVIE, caption, clickAt, clickHandle, exec, frames, handle, inspectUi, installOverlay, open, pause, press, req,
  sketchPoints, typeValue,
} from "./lib";

// Manus: "Make a square body in SolidCraft" (docs/manus/solidcraft-square-body.md).
// A 50 x 50 mm square sketched on XY, extruded 50 mm: a 50 mm cube, 125 000 mm3.
// Real clicks and keystrokes; positions come from SolidCraft's own ui.handles /
// ui.at / ui.sketchToScreen, results are checked through its inspect calls.
//   docker compose run --rm test npx playwright test --project solidcraft
// HELP_MOVIE=1 also records out/help/solidcraft-square-body.webm with captions.

const SIDE = 50; // mm
const HALF = SIDE / 2;

if (MOVIE) test.use({ video: { mode: "on", size: { width: 1440, height: 900 } } });
test.setTimeout(MOVIE ? 240_000 : 120_000);

async function shot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot(), contentType: "image/png" });
}

test("manus: a 50 mm square body (sketch, rectangle, extrude)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await test.step("1. Start a new design in millimetres", async () => {
    await open(page);
    await installOverlay(page);
    await page.mouse.move(720, 450);
    await caption(page, "Click <b>New design</b>", "Millimetres");
    await clickHandle(page, "home:new_mm");
    await expect.poll(async () => (await inspectUi(page)).home).toBeFalsy();
    await shot(page, "1-new-design");
  });

  await test.step("2. Create a sketch on the XY plane", async () => {
    await caption(page, "Click <b>Create Sketch</b>", "then pick the plane to draw on");
    await clickHandle(page, "button:sketch.create");
    expect((await inspectUi(page)).dialog?.command).toBe("sketch.create");
    const [x, y] = await req<[number, number]>(page, "ui.at", { plane: "XY" });
    await caption(page, "Click the <b>XY</b> plane", "the floor of the design");
    await clickAt(page, { x, y });
    await expect.poll(async () => (await exec(page, "sketch.inspect")).plane?.y_dir).toEqual([0, 1, 0]);
    await shot(page, "2-sketch-on-xy");
  });

  await test.step(`3. Draw a ${SIDE} x ${SIDE} mm rectangle`, async () => {
    await caption(page, "Pick <b>2-Point Rectangle</b>", "two opposite corners");
    await clickHandle(page, "button:sketch.rectangle.two_point");
    expect((await inspectUi(page)).tool).toBe("sketch.rectangle.two_point");
    const [a, b] = await sketchPoints(page, [[-HALF, -HALF], [HALF, HALF]]);
    await caption(page, "Click the first corner", "", 1_400);
    await clickAt(page, a);
    await page.mouse.move(b.x - 20, b.y + 20, { steps: MOVIE ? 30 : 10 });
    await frames(page);
    await caption(page, `Type <b>${SIDE}</b>, <b>Tab</b>, <b>${SIDE}</b> and <b>Enter</b>`, "typed sizes win over the mouse", 1_600);
    await typeValue(page, String(SIDE));
    await press(page, "Tab");
    await typeValue(page, String(SIDE));
    await press(page, "Enter");
    await press(page, "Escape"); // leave the rectangle tool
    const sk = await exec(page, "sketch.inspect");
    expect(sk.curves.filter((c: any) => c.type === "line")).toHaveLength(4);
    expect(sk.constraints.filter((k: any) => k.type === "length").map((k: any) => k.value)).toEqual([SIDE, SIDE]);
    const xs = sk.points.filter((p: any) => p.id !== "origin").map((p: any) => p.at[0]);
    const ys = sk.points.filter((p: any) => p.id !== "origin").map((p: any) => p.at[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(SIDE, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(SIDE, 6);
    await shot(page, "3-square-sketch");
  });

  await test.step("4. Finish the sketch", async () => {
    await caption(page, "Click <b>Finish Sketch</b>");
    await clickHandle(page, "button:sketch.finish");
    const doc = await page.evaluate(() => (window as any).solidcraft.inspect());
    expect(doc.active_sketch).toBeNull();
    expect(doc.sketches[0].profiles).toBe(1);
    await shot(page, "4-sketch-finished");
  });

  await test.step(`5. Extrude it ${SIDE} mm`, async () => {
    await caption(page, "Click <b>Extrude</b>", "the square is the only profile, so it is picked already");
    await clickHandle(page, "button:solid.extrude");
    const dlg = (await inspectUi(page)).dialog;
    expect(dlg?.command).toBe("solid.extrude");
    expect(dlg?.commands?.[0]?.params?.profiles).toEqual([0]);
    await caption(page, `Type <b>${SIDE}</b> for the distance`, "", 1_400);
    await typeValue(page, String(SIDE));
    expect((await inspectUi(page)).dialog?.commands?.[0]?.params?.distance).toBe(String(SIDE));
    await caption(page, "Press <b>Enter</b> for OK", "", 1_200);
    await press(page, "Enter");
    await expect.poll(async () => (await inspectUi(page)).dialog).toBeNull();
    await shot(page, "5-extruded");
  });

  await test.step("6. Look at it in 3D", async () => {
    // The Home button beside the axis navigator (top right of the view).
    const home = await handle(page, "axis_view:home");
    const before = (await inspectUi(page)).camera;
    await caption(page, "Click <b>Home</b> beside the axis navigator to see it in 3D", "", 1_400);
    await clickAt(page, home);
    await expect.poll(async () => JSON.stringify((await inspectUi(page)).camera)).not.toBe(JSON.stringify(before));
    await pause(page, 900);
    await shot(page, "6-home-view");
  });

  await test.step(`7. Check: one ${SIDE} mm cube`, async () => {
    const doc = await page.evaluate(() => (window as any).solidcraft.inspect({ measure: true }));
    expect(doc.bodies).toHaveLength(1);
    const body = doc.bodies[0];
    expect(body.closed).toBe(true);
    expect(body.faces).toBe(6);
    expect(body.face_types).toEqual({ plane: 6 });
    expect(body.bbox.min).toEqual([-HALF, -HALF, 0]);
    expect(body.bbox.max).toEqual([HALF, HALF, SIDE]);
    expect(body.volume_mm3).toBeCloseTo(SIDE ** 3, 3);
    expect(doc.timeline.map((f: any) => f.type)).toEqual(["Sketch", "ExtrudeFeature"]);
    expect(doc.timeline.every((f: any) => !f.error)).toBe(true);
    await caption(page, `Done: a ${SIDE} mm cube`, `Sketch → 2-Point Rectangle ${SIDE} × ${SIDE} → Finish → Extrude ${SIDE} mm · ${(SIDE ** 3).toLocaleString("en")} mm³`, 4_000);
    await pause(page, 500);
  });

  expect(errors, errors.join("\n")).toEqual([]);

  if (MOVIE) {
    const out = fs.existsSync("/out") ? "/out/help" : path.join(__dirname, "..", "test-results", "help");
    fs.mkdirSync(out, { recursive: true });
    const video = page.video()!;
    await page.close();
    await video.saveAs(path.join(out, "solidcraft-square-body.webm"));
    console.log(`help movie: ${path.join(out, "solidcraft-square-body.webm")}`);
  }
});
