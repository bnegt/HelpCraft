import { test, expect } from "@playwright/test";

// egui paints everything onto one <canvas>; the DOM hooks are the status div,
// the console, and the canvas pixels.
test("CamCraft starts on WebGPU and paints a non-blank frame", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("./");
  const status = page.locator("#camcraft-status");
  await expect(status).toHaveAttribute("data-state", /running|refused/, { timeout: 90_000 });
  expect(await status.getAttribute("data-state"), await status.textContent() ?? "").toBe("running");

  expect(await page.evaluate(() => !!(navigator as any).gpu)).toBe(true);

  // Let a few frames land, then check the canvas isn't one flat colour
  // (SwiftShader WebGPU gives an all-white frame).
  await page.waitForTimeout(2_000);
  const shot = await page.locator("#camcraft-canvas").screenshot();
  const distinct = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const seen = new Set<number>();
    for (let i = 0; i < d.length && seen.size < 64; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return seen.size;
  }, shot.toString("base64"));
  expect(distinct, "canvas looks blank").toBeGreaterThan(8);

  expect(errors.filter((e) => /panic|RuntimeError|unreachable/i.test(e))).toEqual([]);
});
