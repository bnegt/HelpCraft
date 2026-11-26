import { test } from "@playwright/test";
import path from "node:path";
import { calibrateInto } from "./lib/camcraft";
import { contourFlow, dovetailFlow } from "./lib/flows";

// CALIBRATE=1: run the flows and save, before every click, a screenshot with a
// crosshair and the coords.ts name of the point, into test-results/calibrate/<flow>/.
// Leaf through them to see which coordinates still land where they should.
//   docker compose run --rm -e CALIBRATE=1 test npx playwright test calibrate
test.skip(!process.env.CALIBRATE, "set CALIBRATE=1 to calibrate");

const dir = (flow: string) => path.join(__dirname, "test-results", "calibrate", flow);

test.afterEach(() => calibrateInto(undefined));

test("calibrate: contour", async ({ page }) => {
  calibrateInto(dir("contour"));
  await contourFlow(page).catch((e) => console.log(`contour flow stopped: ${e}`));
});

test("calibrate: dovetail", async ({ page }) => {
  calibrateInto(dir("dovetail"));
  await dovetailFlow(page).catch((e) => console.log(`dovetail flow stopped: ${e}`));
});
