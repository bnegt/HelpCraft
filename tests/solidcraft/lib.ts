import { expect, type Page } from "@playwright/test";

// SolidCraft's web build has a documented browser API (window.solidcraft, see
// https://github.com/tangency-labs/solidcraft/blob/main/docs/browser-api.md):
// every call is a promise that resolves on the UI thread between frames. The
// manus uses it only to FIND things (ui.handles, ui.at, ui.sketchToScreen) and to
// CHECK results (ui.inspect, sketch.inspect, inspect); every action is a real
// Playwright mouse click or keystroke.

export type XY = { x: number; y: number };

/** True when recording the help movie: captions, cursor and pauses are on. */
export const MOVIE = !!process.env.HELP_MOVIE;

export const req = <T = any>(page: Page, method: string, params: object = {}) =>
  page.evaluate(([m, p]) => (window as any).solidcraft.request(m, p), [method, params] as const) as Promise<T>;

export const exec = <T = any>(page: Page, command: string, params: object = {}) =>
  page.evaluate(([c, p]) => (window as any).solidcraft.execute(c, p), [command, params] as const) as Promise<T>;

export const inspectUi = (page: Page) => req(page, "ui.inspect");

/** Open the app, wait for its API, and turn off usage statistics for this test profile. */
export async function open(page: Page) {
  await page.goto(process.env.SOLIDCRAFT_URL ?? "https://solidcraft.io/app");
  await page.waitForFunction(() => !!(window as any).solidcraft, null, { timeout: 90_000 });
  await expect.poll(async () => (await inspectUi(page)).frame_ms !== undefined, { timeout: 30_000 }).toBe(true);
  await req(page, "ui.prefs", { usage_statistics: false });
  await frames(page);
}

/** Let egui process what was just sent: a couple of animation frames. */
export async function frames(page: Page, n = 3) {
  for (let i = 0; i < n; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
}

/** The screen point of a named handle (`button:solid.extrude`, `home:new_mm`, ...). */
export async function handle(page: Page, name: string): Promise<XY> {
  const all: { name: string; x: number; y: number }[] = await req(page, "ui.handles", {}).then((h: any) => h.handles ?? h);
  const h = all.find((e) => e.name === name);
  if (!h) throw new Error(`no handle "${name}" on screen; similar: ${all.map((e) => e.name).filter((n) => n.includes(name.split(":").pop()!.split(".")[0])).join(", ")}`);
  return { x: h.x, y: h.y };
}

/** Screen points of sketch coordinates (mm) in the active sketch. */
export async function sketchPoints(page: Page, pts: [number, number][]): Promise<XY[]> {
  const s: [number, number][] = await req(page, "ui.sketchToScreen", { points: pts });
  return s.map(([x, y]) => ({ x, y }));
}

/** Glide to p and click it, as a person would (with a pause before the click in the movie). */
export async function clickAt(page: Page, p: XY) {
  await page.mouse.move(p.x, p.y, { steps: MOVIE ? 30 : 8 });
  await pause(page, 450);
  await page.mouse.click(p.x, p.y);
  await frames(page);
  await pause(page, 400);
}

export const clickHandle = async (page: Page, name: string) => clickAt(page, await handle(page, name));

/** Type a value into the focused egui field. A frame after each key group, so a Tab lands before the next text. */
export async function typeValue(page: Page, text: string) {
  await page.keyboard.type(text, { delay: MOVIE ? 140 : 20 });
  await frames(page);
}

export async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await frames(page);
  await pause(page, 250);
}

export const pause = (page: Page, ms: number) => (MOVIE ? page.waitForTimeout(ms) : Promise.resolve());

// ---- help-movie overlay: a caption banner and a drawn cursor, as DOM over the canvas ----

export async function installOverlay(page: Page) {
  if (!MOVIE) return;
  await page.evaluate(() => {
    const css = document.createElement("style");
    css.textContent = `
      #hc-cap{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);max-width:900px;z-index:20;
        background:rgba(15,18,24,.92);color:#fff;font:600 22px/1.35 system-ui,sans-serif;padding:14px 22px;
        border-radius:10px;border:1px solid #4a90e2;text-align:center;pointer-events:none}
      #hc-cap small{display:block;font-weight:400;font-size:16px;color:#b8c4d6;margin-top:4px}
      #hc-cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:30;pointer-events:none;transform:translate(-3px,-2px)}
      .hc-ring{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border:3px solid #ffcc00;
        border-radius:50%;z-index:29;pointer-events:none;animation:hcr .6s ease-out forwards}
      @keyframes hcr{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    document.head.appendChild(css);
    const cur = document.createElement("div");
    cur.id = "hc-cur";
    cur.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 18 L6.5 14 L9.5 20.5 L12.5 19 L9.5 12.8 L15.5 12.8 Z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(cur);
    const move = (e: MouseEvent) => { cur.style.left = `${e.clientX}px`; cur.style.top = `${e.clientY}px`; };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerdown", (e) => {
      const r = document.createElement("div");
      r.className = "hc-ring"; r.style.left = `${e.clientX}px`; r.style.top = `${e.clientY}px`;
      document.body.appendChild(r); setTimeout(() => r.remove(), 700);
    }, true);
  });
}

export async function caption(page: Page, text: string, sub = "", ms = 2_200) {
  if (!MOVIE) return;
  await page.evaluate(({ text, sub }) => {
    let c = document.getElementById("hc-cap");
    if (!c) { c = document.createElement("div"); c.id = "hc-cap"; document.body.appendChild(c); }
    c.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
  }, { text, sub });
  await page.waitForTimeout(ms);
}
