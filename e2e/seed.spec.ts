// risk: test-plan.md #2/#3 - family catalog remains visible and searchable after navigation
// seed: .agents/skills/10x-e2e/references/seed-test-pattern.md
import { expect, test } from "@playwright/test";

import { chooseFamilyProfile, enterSelectedProfile, requireE2ESecret } from "./helpers";

test.describe("critical catalog e2e seed", () => {
  test("risk #2/#3 family catalog search survives reload with seeded data", async ({ page }) => {
    const familyPassword = requireE2ESecret("FAMILY_SHELF_FAMILY_PASSWORD");
    const seedTitle = "Dune";

    // Set up a real family session through the app entry gate.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();
    await chooseFamilyProfile(page, "Family profile 1");
    await page.getByLabel("Family password").fill(familyPassword);
    await enterSelectedProfile(page);

    // Navigate to the catalog and assert readable data from the real boundary.
    await page.getByRole("link", { name: "Open catalog" }).click();
    await expect(page).toHaveURL(/\/items$/);
    await expect(page.getByRole("heading", { name: "Item catalog" })).toBeVisible();
    await expect(page.getByText(seedTitle, { exact: true })).toBeVisible();

    // Search for stable seed data, then verify the state survives a reload.
    await page.getByLabel("Search catalog").fill(seedTitle);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/items\?q=Dune$/);
    await expect(page.getByText("1 matching")).toBeVisible();
    await expect(page.getByText(seedTitle, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Item catalog" })).toBeVisible();
    await expect(page.getByText(seedTitle, { exact: true })).toBeVisible();
  });
});
