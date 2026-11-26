# Chromium for CamCraft: the Playwright image + Mesa Vulkan, so WebGPU runs on the
# host GPU passed in as /dev/dri. (SwiftShader WebGPU starts but paints white;
# CamCraft's WebGL2 fallback panics on `noperspective` - see README.)
FROM mcr.microsoft.com/playwright:v1.65.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends mesa-vulkan-drivers vulkan-tools \
    && rm -rf /var/lib/apt/lists/*
# Playwright MCP pins its own Playwright build; fetch the Chromium that build expects.
RUN npm install -g @playwright/mcp@0.0.86 \
    && cd /usr/lib/node_modules/@playwright/mcp && npx playwright install chromium
