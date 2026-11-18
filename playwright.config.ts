import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    reporter: [["list"]],
    use: {
        baseURL: "http://localhost:5199",
        viewport: { width: 1920, height: 1080 },
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium" }, { name: "webkit" }],
    webServer: {
        command: "npm run dev -- --port 5199 --strictPort",
        url: "http://localhost:5199",
        reuseExistingServer: !process.env.CI,
    },
});