import { defineConfig } from "@playwright/test";

// Same Chromium flags as mcp/config.json: WebGPU on the host GPU via Vulkan.
// SwiftShader paints white and the WebGL2 fallback panics (see README).
export default defineConfig({
  testDir: ".",
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
