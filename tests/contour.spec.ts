import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { at, collectConsole, FIXTURES, settle } from "./lib/camcraft";
import { postDialog, ribbon, shotClip } from "./lib/coords";
import { CONTOUR_TOOL, contourFlow } from "./lib/flows";
import { objBounds, parseMoves } from "./lib/gcode";

// Manus 1 (#1): import a part, fit the stock, add a 6 mm flat end mill, make an
// outside contour around the part's bottom edge loop, generate.
// Manus 1b (#2): post it and check the G-code against the part.

async function snap(page: Page, name: string) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { clip: shotClip, maxDiffPixelRatio: 0.0005 });
}

test("manus 1: contour toolpath around an imported part", async ({ page }) => {
  const con = collectConsole(page);
  await contourFlow(page, (n) => snap(page, n));
  expect(con.errors).toEqual([]);
});

test("manus 1b: posted G-code follows the part outline", async ({ page }) => {
  const con = collectConsole(page);
  await contourFlow(page);

  const download = page.waitForEvent("download", { timeout: 15_000 });
  await at(page, ribbon.post);
  const d = await download.catch(async (e) => {
    await page.screenshot({ path: test.info().outputPath("post-refused.png") });
    await at(page, postDialog.close);
    throw new Error(`Post gave no download (refused?): ${e}`);
  });
  const gcode = fs.readFileSync((await d.path())!, "utf8");
  await test.info().attach(d.suggestedFilename(), { body: gcode, contentType: "text/plain" });
  expect(d.suggestedFilename()).toMatch(/\.nc$/);

  const moves = parseMoves(gcode);
  expect(moves.some((m) => m.g === 0), "rapid moves").toBe(true);
  expect(moves.some((m) => m.g === 1), "feed moves").toBe(true);

  // Outside contour: the cutter centre runs on the part's outline offset by the tool radius.
  const part = objBounds(fs.readFileSync(path.join(FIXTURES, "first-part.obj"), "utf8"));
  const r = CONTOUR_TOOL.d / 2, eps = 0.01;
  const ring = { minX: part.minX - r, maxX: part.maxX + r, minY: part.minY - r, maxY: part.maxY + r };
  const cuts = moves.filter((m) => m.g !== 0);
  // Lead-in/out arcs reach outside the ring; the ring itself is what's inside it.
  const onRing = cuts.filter((m) =>
    m.x >= ring.minX - eps && m.x <= ring.maxX + eps && m.y >= ring.minY - eps && m.y <= ring.maxY + eps);
  expect(onRing.length).toBeGreaterThan(8);
  const xs = onRing.map((m) => m.x), ys = onRing.map((m) => m.y);
  expect(Math.min(...xs)).toBeCloseTo(ring.minX, 2);
  expect(Math.max(...xs)).toBeCloseTo(ring.maxX, 2);
  expect(Math.min(...ys)).toBeCloseTo(ring.minY, 2);
  expect(Math.max(...ys)).toBeCloseTo(ring.maxY, 2);
  // Nothing cuts into the part: every cutting point is at least r from its XY box
  // (distance to a rectangle, so the rounded corners count as on the ring).
  const distToPart = (x: number, y: number) =>
    Math.hypot(Math.max(part.minX - x, 0, x - part.maxX), Math.max(part.minY - y, 0, y - part.maxY));
  const gouges = cuts.filter((m) => distToPart(m.x, m.y) < r - eps);
  expect(gouges.map((m) => `line ${m.line}: X${m.x} Y${m.y}`)).toEqual([]);
  // Full depth, down to the part's bottom.
  expect(Math.min(...cuts.map((m) => m.z))).toBeCloseTo(part.minZ, 2);

  expect(con.errors).toEqual([]);
});
