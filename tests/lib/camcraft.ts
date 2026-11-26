import { expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import * as coords from "./coords";
import { type XY, ribbon } from "./coords";

export const FIXTURES = path.join(__dirname, "..", "fixtures");

/** Console errors, uncaught page errors and panics, collected from page creation on. */
export function collectConsole(page: Page) {
  const errors: string[] = [];
  const all: string[] = [];
  page.on("console", (m) => {
    all.push(`${m.type()}: ${m.text()}`);
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { errors, all };
}

/** Load the app and wait until the runner says it is running and has drawn. */
export async function open(page: Page) {
  const firstFrame = page.waitForEvent("console", {
    predicate: (m) => m.text().includes("first frame drawn"),
    timeout: 90_000,
  });
  await page.goto("./");
  const status = page.locator("#camcraft-status");
  await expect(status).toHaveAttribute("data-state", /running|refused/, { timeout: 90_000 });
  expect(await status.getAttribute("data-state"), (await status.textContent()) ?? "").toBe("running");
  await firstFrame;
  // The first frames ignore input; give egui a moment before clicking.
  await settle(page, 1_000);
}

/** egui repaints on input; wait a few frames for the result of the last action. */
export async function settle(page: Page, ms = 400) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(ms);
}

// ---- calibration: a marked screenshot before every click (see calibrate.spec.ts) ----
const names = new Map<object, string>();
for (const [group, v] of Object.entries(coords)) {
  if (v && typeof v === "object") for (const [k, p] of Object.entries(v)) if (p && typeof p === "object") names.set(p, `${group}.${k}`);
}
let calibrateDir: string | undefined;
let calibrateN = 0;
export function calibrateInto(dir: string | undefined) { calibrateDir = dir; calibrateN = 0; if (dir) fs.mkdirSync(dir, { recursive: true }); }

async function mark(page: Page, p: XY) {
  if (!calibrateDir) return;
  const name = names.get(p) ?? `unnamed(${p.x},${p.y})`;
  await page.evaluate(({ x, y, name }) => {
    const d = document.createElement("div");
    d.id = "hc-mark";
    d.style.cssText = `position:fixed;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;border:2px solid #f0f;border-radius:50%;pointer-events:none;z-index:9;box-shadow:0 0 0 1px #000`;
    d.innerHTML = `<div style="position:absolute;left:11px;top:-6px;width:2px;height:36px;background:#f0f"></div><div style="position:absolute;top:11px;left:-6px;height:2px;width:36px;background:#f0f"></div><span style="position:absolute;left:28px;top:2px;white-space:nowrap;font:bold 12px monospace;color:#fff;background:#a0a;padding:1px 4px">${name} (${x},${y})</span>`;
    document.body.appendChild(d);
  }, { ...p, name });
  const file = `${String(++calibrateN).padStart(2, "0")}-${name.replace(/[^\w.()-]+/g, "_")}.png`;
  await page.screenshot({ path: `${calibrateDir}/${file}` });
  await page.evaluate(() => document.getElementById("hc-mark")?.remove());
}

export async function at(page: Page, p: XY, opts: { shift?: boolean } = {}) {
  await mark(page, p);
  if (opts.shift) await page.keyboard.down("Shift");
  await page.mouse.click(p.x, p.y);
  if (opts.shift) await page.keyboard.up("Shift");
  await settle(page);
}

/** Click a text field, replace its contents and commit with Enter. */
export async function fill(page: Page, p: XY, text: string) {
  await at(page, p);
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text, { delay: 20 });
  await page.keyboard.press("Enter");
  await settle(page);
}

/** Model button -> file chooser -> fixture. */
export async function importModel(page: Page, fixture: string) {
  await mark(page, ribbon.model);
  const chooser = page.waitForEvent("filechooser", { timeout: 10_000 });
  await page.mouse.click(ribbon.model.x, ribbon.model.y);
  await (await chooser).setFiles(path.join(FIXTURES, fixture));
  await settle(page, 1_000);
}
