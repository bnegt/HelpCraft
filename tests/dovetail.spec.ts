import { test, expect } from "@playwright/test";
import { collectConsole, fill, open, settle } from "./lib/camcraft";
import { dovetail, newTool } from "./lib/coords";
import { chooseBallNose, chooseDovetail, openNewTool, scrollProps } from "./lib/flows";
import { crop, same } from "./lib/pixels";

// #5, NeoTech/Camcraft#4004 (fixed by PR #4009): a dovetail cutter has a Corner
// radius that keeps its value and changes the cutter drawing.
// Expected: fails on main (no such field), passes on the PR build.
//
// No baselines and no OCR: switching the New tool form from End mill to Ball nose
// keeps every label but forces Corner radius from 0 to D/2, so the one row whose
// label stays and whose value changes is "Corner radius", in this build's font and
// layout. That label crop is what we look for in the Dovetail form. Row order
// differs between builds (main has a Left-hand cutter row the PR's base lacks).

test("dovetail cutter has a working corner radius (Camcraft#4004)", async ({ page, baseURL }) => {
  // Open on main until PR #4009 merges: an expected failure there keeps the suite green,
  // and Playwright flags it as soon as main passes, which is the cue to delete this line.
  test.fail(/\/main\/?$/.test(baseURL ?? ""), "Camcraft#4004 is open on main (fixed by PR #4009)");
  const con = collectConsole(page);
  await open(page);
  await openNewTool(page);
  const grab = async (rects: typeof newTool.labelRows) => { const out = []; for (const r of rects) out.push(await crop(page, r)); return out; };
  const emLabels = await grab(newTool.labelRows), emValues = await grab(newTool.valueRows);
  await chooseBallNose(page);
  const bnLabels = await grab(newTool.labelRows), bnValues = await grab(newTool.valueRows);
  const changed = emLabels
    .map((_, i) => i)
    .filter((i) => same(emLabels[i], bnLabels[i], 4) && !same(emValues[i], bnValues[i], 4));
  expect(changed.length, "expected exactly one row (Corner radius) to change from End mill to Ball nose").toBe(1);
  const label = emLabels[changed[0]];

  await chooseDovetail(page);
  const row = (await grab(newTool.labelRows)).findIndex((r) => same(r, label, 4));
  await test.info().attach("dovetail-form.png", { body: await page.screenshot(), contentType: "image/png" });
  expect(row, "the Dovetail form has no Corner radius field").toBeGreaterThanOrEqual(0);
  const corner = { x: newTool.valueX, y: newTool.rowY[row] };
  const cornerField = newTool.valueRows[row];
  expect(corner.y, "Corner radius isn't on the row coords.dovetail expects").toBe(dovetail.cornerRadius.y);

  // 19.05 mm, 60 deg, flutes 9.525, shank 8 (the issue's cutter)
  await fill(page, dovetail.diameter, "19.05");
  await fill(page, dovetail.flankAngle, "60");
  await fill(page, dovetail.fluteLength, "9.525");
  await fill(page, dovetail.shankDiameter, "8");
  await page.keyboard.press("Escape");
  const field0 = await crop(page, cornerField);
  await scrollProps(page, "bottom");
  const drawing0 = await crop(page, newTool.drawingAtBottom);
  await scrollProps(page, "top");

  await fill(page, corner, "1.0");
  await page.keyboard.press("Escape");
  await page.mouse.move(700, 600);
  await settle(page);
  const field1 = await crop(page, cornerField);
  expect(same(field1, field0), "Corner radius field didn't change when set to 1.0").toBe(false);

  // Edit another field; the corner radius must still read the same.
  await fill(page, dovetail.shankLength, "30");
  await page.keyboard.press("Escape");
  await page.mouse.move(700, 600);
  await settle(page);
  expect(same(await crop(page, cornerField), field1, 4), "Corner radius lost its value").toBe(true);

  await scrollProps(page, "bottom");
  const drawing1 = await crop(page, newTool.drawingAtBottom);
  await test.info().attach("drawing-r1.png", { body: await page.screenshot({ clip: newTool.drawingAtBottom }), contentType: "image/png" });
  expect(same(drawing1, drawing0), "cutter drawing didn't change with the corner radius").toBe(false);

  expect(con.errors).toEqual([]);
});
