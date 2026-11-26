import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { at, fill, importModel, open, settle } from "./lib/camcraft";
import { contour, firstPart, ribbon, stock, toolLibrary, twoDMenu, type XY } from "./lib/coords";
import { CONTOUR_TOOL } from "./lib/flows";

// A help movie, not a test: "How to make a contour toolpath" in CamCraft, recorded
// as video with captions and a visible cursor. Skipped unless HELP_MOVIE=1:
//   docker compose run --rm -e HELP_MOVIE=1 test npx playwright test help-contour
// Writes out/help/contour-path.webm (out/ is mounted at /out by scripts/help-movie.sh,
// else tests/test-results/help/).
test.skip(!process.env.HELP_MOVIE, "set HELP_MOVIE=1 to record the help movie");
test.use({ video: { mode: "on", size: { width: 1440, height: 900 } } });
test.setTimeout(240_000);

const OUT = fs.existsSync("/out") ? "/out/help" : path.join(__dirname, "test-results", "help");

/** Caption banner and a fake cursor, as DOM over the canvas (the video records both). */
async function installOverlay(page: Page) {
  await page.evaluate(() => {
    const css = document.createElement("style");
    css.textContent = `
      #hc-cap{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);max-width:900px;z-index:20;
        background:rgba(15,18,24,.92);color:#fff;font:600 22px/1.35 system-ui,sans-serif;padding:14px 22px;
        border-radius:10px;border:1px solid #4a90e2;box-shadow:0 6px 24px rgba(0,0,0,.5);text-align:center;
        pointer-events:none;transition:opacity .25s}
      #hc-cap small{display:block;font-weight:400;font-size:16px;color:#b8c4d6;margin-top:4px}
      #hc-step{position:fixed;left:16px;top:96px;z-index:20;background:#4a90e2;color:#fff;font:700 15px system-ui;
        padding:4px 10px;border-radius:6px;pointer-events:none}
      #hc-cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:30;pointer-events:none;
        transform:translate(-3px,-2px)}
      .hc-ring{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border:3px solid #ffcc00;
        border-radius:50%;z-index:29;pointer-events:none;animation:hcr .6s ease-out forwards}
      @keyframes hcr{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
      #hc-title{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;
        justify-content:center;background:rgba(10,12,16,.94);color:#fff;font:700 44px system-ui;pointer-events:none}
      #hc-title small{font:400 22px system-ui;color:#b8c4d6;margin-top:14px}`;
    document.head.appendChild(css);
    const cur = document.createElement("div");
    cur.id = "hc-cur";
    cur.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 18 L6.5 14 L9.5 20.5 L12.5 19 L9.5 12.8 L15.5 12.8 Z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(cur);
    const move = (e: MouseEvent) => { cur.style.left = `${e.clientX}px`; cur.style.top = `${e.clientY}px`; };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("mousemove", move, true);
    window.addEventListener("pointerdown", (e) => {
      const r = document.createElement("div");
      r.className = "hc-ring"; r.style.left = `${e.clientX}px`; r.style.top = `${e.clientY}px`;
      document.body.appendChild(r); setTimeout(() => r.remove(), 700);
    }, true);
  });
}

async function caption(page: Page, text: string, sub = "", ms = 2_600) {
  await page.evaluate(({ text, sub }) => {
    let c = document.getElementById("hc-cap");
    if (!c) { c = document.createElement("div"); c.id = "hc-cap"; document.body.appendChild(c); }
    c.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
  }, { text, sub });
  await page.waitForTimeout(ms);
}

async function step(page: Page, n: number, of: number, title: string) {
  await page.evaluate(({ label }) => {
    let s = document.getElementById("hc-step");
    if (!s) { s = document.createElement("div"); s.id = "hc-step"; document.body.appendChild(s); }
    s.textContent = label;
  }, { label: `Step ${n} of ${of} · ${title}` });
}

async function titleCard(page: Page, title: string, sub: string, ms = 3_000) {
  await page.evaluate(({ title, sub }) => {
    const t = document.createElement("div");
    t.id = "hc-title"; t.innerHTML = `${title}<small>${sub}</small>`;
    document.body.appendChild(t);
  }, { title, sub });
  await page.waitForTimeout(ms);
  await page.evaluate(() => document.getElementById("hc-title")?.remove());
}

/** Glide the cursor to p, pause so the viewer sees where, then click. */
async function go(page: Page, p: XY, opts: { shift?: boolean; pause?: number } = {}) {
  await page.mouse.move(p.x, p.y, { steps: 30 });
  await page.waitForTimeout(opts.pause ?? 450);
  await at(page, p, opts);
  await page.waitForTimeout(500);
}

async function typeInto(page: Page, p: XY, text: string) {
  await page.mouse.move(p.x, p.y, { steps: 30 });
  await page.waitForTimeout(400);
  await at(page, p);
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text, { delay: 140 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await settle(page, 600);
}

test("help movie: how to make a contour toolpath", async ({ page }) => {
  const N = 6;
  await open(page);
  await installOverlay(page);
  await page.mouse.move(720, 450);
  await titleCard(page, "Making a contour toolpath", "CamCraft · cut around the outside of a part with a 6 mm end mill", 3_500);

  await step(page, 1, N, "Import the part");
  await caption(page, "Click <b>Model</b> and pick your STL, STEP or OBJ file", "Here: a 100 × 60 × 15 mm plate");
  await page.mouse.move(ribbon.model.x, ribbon.model.y, { steps: 30 });
  await page.waitForTimeout(400);
  await importModel(page, "first-part.obj");
  await caption(page, "The part appears in the viewport and under MODELS", "", 2_200);

  await step(page, 2, N, "Stock");
  await caption(page, "Click <b>Stock</b> to set the block you cut from", "", 1_800);
  await go(page, ribbon.stock);
  await caption(page, "<b>Fit to Models</b> wraps the part in a box", "2 mm margin on every side: 104 × 64 × 19 mm", 1_800);
  await go(page, stock.fitToModels);
  await page.waitForTimeout(1_500);

  await step(page, 3, N, "Tool");
  await caption(page, "Open <b>Tools</b> and find a 6 mm flat end mill in the catalog", "", 1_800);
  await go(page, ribbon.tools);
  await go(page, toolLibrary.catalogTab);
  await caption(page, "Type in the <b>Name filter</b> to narrow the list", "", 1_200);
  await typeInto(page, toolLibrary.nameFilter, "EM-0600");
  await caption(page, "Click <b>Add</b>: it becomes tool T1 in this document", "", 1_400);
  await go(page, toolLibrary.firstRowAdd);
  await caption(page, "Its flutes are 15 mm long, but this cut goes 17 mm deep", "Above the flutes the wider shank would rub the wall, so Post would refuse", 3_200);
  await go(page, toolLibrary.documentTab);
  await go(page, toolLibrary.firstRowEdit);
  await caption(page, `Set <b>Flute length</b> to ${CONTOUR_TOOL.flute} mm and <b>Apply</b>`, "A long-flute 6 mm end mill", 1_400);
  await typeInto(page, toolLibrary.fluteLength, CONTOUR_TOOL.flute);
  await go(page, toolLibrary.apply);
  await page.waitForTimeout(800);
  await go(page, toolLibrary.close);

  await step(page, 4, N, "Contour operation");
  await caption(page, "<b>2D</b> → <b>2D Contour</b> creates the operation", "It picks up T1 by itself", 1_800);
  await go(page, ribbon.twoD);
  await go(page, twoDMenu.contour, { pause: 700 });
  await page.waitForTimeout(1_000);

  await step(page, 5, N, "Pick the outline");
  await caption(page, "Set <b>Click selects</b> to <b>Edges</b>", "", 1_600);
  await go(page, contour.clickSelectsEdges);
  await caption(page, "<b>Frame</b> brings the whole part into view", "", 1_400);
  await go(page, ribbon.frame);
  await caption(page, "<b>Shift+click</b> the bottom edge: it picks the whole loop", "Four edges, stitched into one ring", 1_600);
  await go(page, firstPart.bottomFrontEdge, { shift: true, pause: 900 });
  await page.waitForTimeout(1_800);
  await caption(page, "Set <b>Side</b> to <b>Outside</b>: the tool runs around the part, not into it", "", 1_800);
  await go(page, contour.sideAfterLoop);
  await go(page, contour.sideOutside, { pause: 700 });

  await step(page, 6, N, "Generate");
  await caption(page, "Click <b>Generate</b>", "", 1_400);
  await go(page, contour.generate);
  await settle(page, 1_500);
  await caption(page, "Done: 4 passes down to the bottom, rounded corners outside the part", "Next: Simulate to check it, or Post to write the G-code", 4_500);

  await titleCard(page, "That's a contour toolpath", "Model → Stock → Tool → 2D Contour → Edges + Shift+click → Outside → Generate", 4_000);

  fs.mkdirSync(OUT, { recursive: true });
  const video = page.video()!;
  await page.close();
  await video.saveAs(path.join(OUT, "contour-path.webm"));
  console.log(`help movie: ${path.join(OUT, "contour-path.webm")}`);
});
