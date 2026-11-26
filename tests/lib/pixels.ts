import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { Page } from "@playwright/test";

export type Rect = { x: number; y: number; width: number; height: number };

export async function crop(page: Page, clip: Rect): Promise<PNG> {
  return PNG.sync.read(await page.screenshot({ clip }));
}

/** Number of pixels that differ (anti-aliasing tolerant). Images must be the same size. */
export function diffCount(a: PNG, b: PNG, out?: PNG): number {
  return pixelmatch(a.data, b.data, out?.data ?? null, a.width, a.height, { threshold: 0.1 });
}

export function same(a: PNG, b: PNG, maxDiff = 0): boolean {
  return a.width === b.width && a.height === b.height && diffCount(a, b) <= maxDiff;
}
