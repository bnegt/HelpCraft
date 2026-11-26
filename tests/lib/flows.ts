// UI flows shared by the specs and by the before/after capture (compare.spec.ts).
// `shot(name)` is called at each step: an assertion in the specs, a saved PNG in capture.
import type { Page } from "@playwright/test";
import { at, fill, importModel, open, settle } from "./camcraft";
import { contour, dovetail, firstPart, newTool, ribbon, stock, toolLibrary, twoDMenu } from "./coords";

export type Shot = (name: string) => Promise<void>;
const noShot: Shot = async () => {};

// Catalog EM-0600-4FL has 15 mm of flute under an 8 mm shank; the contour cuts
// 17 mm below the stock top, so the shank would rub the wall and Post refuses.
// A 25 mm flute is an ordinary long-flute 6 mm end mill.
export const CONTOUR_TOOL = { d: 6, flute: "25" };

/** Manus 1: first-part.obj, fitted stock, 6 mm end mill, outside contour on the bottom loop, generated. */
export async function contourFlow(page: Page, shot: Shot = noShot) {
  await open(page);
  await shot("01-open");

  await importModel(page, "first-part.obj");
  await shot("02-model");

  await at(page, ribbon.stock);
  await at(page, stock.fitToModels);
  await shot("03-stock");

  await at(page, ribbon.tools);
  await at(page, toolLibrary.catalogTab);
  await fill(page, toolLibrary.nameFilter, "EM-0600");
  await at(page, toolLibrary.firstRowAdd);
  await at(page, toolLibrary.documentTab);
  await at(page, toolLibrary.firstRowEdit);
  await fill(page, toolLibrary.fluteLength, CONTOUR_TOOL.flute);
  await at(page, toolLibrary.apply);
  await shot("04-tool");
  await at(page, toolLibrary.close);

  await at(page, ribbon.twoD);
  await at(page, twoDMenu.contour);
  await at(page, contour.clickSelectsEdges);
  await at(page, ribbon.frame);
  await at(page, firstPart.bottomFrontEdge, { shift: true });
  await at(page, contour.sideAfterLoop);
  await at(page, contour.sideOutside);
  await shot("05-contour-setup");

  await at(page, contour.generate);
  await settle(page, 2_000);
  await shot("06-generated");
}

/** Tools -> New tool..., the form showing its default End mill. */
export async function openNewTool(page: Page) {
  await at(page, ribbon.tools);
  await at(page, toolLibrary.newTool);
}

export async function chooseBallNose(page: Page) {
  await at(page, newTool.type);
  await at(page, newTool.typeBallNose);
}

/** Pick Dovetail cutter in the New tool form's Type combo (bottom of a scrolled list). */
export async function chooseDovetail(page: Page) {
  await at(page, newTool.type);
  await page.mouse.move(newTool.typeList.x, newTool.typeList.y);
  await page.mouse.wheel(0, 2000);
  await settle(page);
  await at(page, newTool.typeDovetailAtBottom);
}

/** Scroll the Properties pane to the top (fields) or the bottom (cutter drawing). */
export async function scrollProps(page: Page, where: "top" | "bottom") {
  await page.mouse.move(newTool.paneScroll.x, newTool.paneScroll.y);
  await page.mouse.wheel(0, where === "top" ? -3000 : 3000);
  await settle(page);
}

/** #5 steps without assertions, for before/after capture. */
export async function dovetailFlow(page: Page, shot: Shot = noShot) {
  await open(page);
  await openNewTool(page);
  await chooseDovetail(page);
  await shot("dovetail-01-form");
  await fill(page, dovetail.diameter, "19.05");
  await fill(page, dovetail.cornerRadius, "1.0");
  await page.keyboard.press("Escape");
  await scrollProps(page, "bottom");
  await shot("dovetail-02-drawing");
}
