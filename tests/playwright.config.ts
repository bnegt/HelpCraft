import { defineConfig } from "@playwright/test";

// Same Chromium flags as mcp/config.json: WebGPU on the host GPU via Vulkan.
// SwiftShader paints white and the WebGL2 fallback panics (see README).
// Projects: "camcraft" is the default suite (everything outside solidcraft/).
// "solidcraft" (tests/solidcraft/, against https://solidcraft.io/app or SOLIDCRAFT_URL)
// only runs when picked: `npx playwright test --project solidcraft`.
// The choice is passed on in the environment: worker processes inherit it, not argv.
if (process.argv.some((a) => a.includes("solidcraft"))) process.env.HC_SOLIDCRAFT = "1";
const wantsSolidcraft = !!process.env.HC_SOLIDCRAFT;

export default defineConfig({
  testDir: ".",
  projects: [
    { name: "camcraft", testIgnore: "solidcraft/**" },
    ...(wantsSolidcraft ? [{ name: "solidcraft", testDir: "./solidcraft" }] : []),
  ],
  outputDir: "test-results",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8090/main/",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      chromiumSandbox: false,
      args: [
        "--enable-unsafe-webgpu",
        "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
        "--use-angle=vulkan",
        "--use-vulkan=native",
        "--ignore-gpu-blocklist",
        "--disable-vulkan-surface",
      ],
    },
  },
});
