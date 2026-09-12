import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadLocalEnv() {
  try {
    const source = readFileSync(join(process.cwd(), ".env.local"), "utf8");

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const rawValue = trimmed.slice(separatorIndex + 1);
      const value = rawValue.replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch {
    // CI and preview checks can inject env vars directly.
  }
}

loadLocalEnv();

const baseURL = process.env.FAMILY_SHELF_E2E_BASE_URL ?? "http://localhost:3000";
const familyStorageState = process.env.FAMILY_SHELF_E2E_FAMILY_STORAGE_STATE;
const authenticatedSpecPattern = /.*\.authenticated\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: authenticatedSpecPattern,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(familyStorageState
      ? [
          {
            name: "chromium-family-auth",
            testMatch: authenticatedSpecPattern,
            use: {
              ...devices["Desktop Chrome"],
              storageState: familyStorageState,
            },
          },
        ]
      : []),
  ],
});
