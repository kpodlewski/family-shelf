import { Page, expect } from "@playwright/test";

export function requireE2ESecret(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} should be configured for browser e2e checks`);
  }

  return value;
}

export async function chooseFamilyProfile(page: Page, profileLabel: string) {
  await page.getByLabel(profileLabel).check();
}

export async function enterSelectedProfile(page: Page) {
  await page.getByRole("button", { name: "Enter app" }).click();
  await expect(page.getByRole("button", { name: "Change profile" })).toBeVisible();
}
