import { expect, test } from "@playwright/test";

import { chooseFamilyProfile, enterSelectedProfile, requireE2ESecret } from "./helpers";

test("family profile can open and search the item catalog", async ({ page }) => {
  const familyPassword = requireE2ESecret("FAMILY_SHELF_FAMILY_PASSWORD");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();

  await chooseFamilyProfile(page, "Family profile 1");
  await page.getByLabel("Family password").fill(familyPassword);
  await enterSelectedProfile(page);

  await expect(page.getByText("Family profile 1")).toBeVisible();
  await expect(page.getByText("Catalog updates allowed")).toBeVisible();

  await page.getByRole("link", { name: "Open catalog" }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole("heading", { name: "Item catalog" })).toBeVisible();
  await expect(page.getByText("Dune", { exact: true })).toBeVisible();

  await page.getByLabel("Search catalog").fill("Dune");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/items\?q=Dune$/);
  await expect(page.getByText("1 matching")).toBeVisible();
  await expect(page.getByText("Dune", { exact: true })).toBeVisible();
  await expect(page.getByText("Catan", { exact: true })).toHaveCount(0);
});
