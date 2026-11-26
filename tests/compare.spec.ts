import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { settle } from "./lib/camcraft";
import { shotClip } from "./lib/coords";
import { contourFlow, dovetailFlow, type Shot } from "./lib/flows";

// Capture only (no assertions): screenshots of each flow step into $CAPTURE_DIR,
// for scripts/compare-pr.sh to put main and a PR side by side. Skipped otherwise.
const dir = process.env.CAPTURE_DIR;
test.skip(!dir, "set CAPTURE_DIR to capture");

function saver(page: import("@playwright/test").Page): Shot {
  return async (name) => {
    await settle(page);
    fs.mkdirSync(dir!, { recursive: true });
    await page.screenshot({ path: path.join(dir!, `${name}.png`), clip: shotClip });
  };
}

test("capture: contour", async ({ page }) => { await contourFlow(page, saver(page)); });
test("capture: dovetail", async ({ page }) => { await dovetailFlow(page, saver(page)); });
