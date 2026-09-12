import { expect, test } from "@playwright/test";

import {
  chooseFamilyProfile,
  chooseGuestProfile,
  enterSelectedProfile,
  requireE2ESecret,
} from "./helpers";

test("family profile can open and search the item catalog", async ({ page }) => {
  const familyPassword = requireE2ESecret("FAMILY_SHELF_FAMILY_PASSWORD");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();

  await chooseFamilyProfile(page, "Kasia");
  await page.getByLabel("Family password").fill(familyPassword);
  await enterSelectedProfile(page);

  await expect(page.getByText("Kasia")).toBeVisible();
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

test("guest profile can browse catalog without write controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();

  await chooseGuestProfile(page);
  await enterSelectedProfile(page);

  await expect(page.getByText("Using Guest")).toBeVisible();
  await expect(page.getByText("Read-only")).toBeVisible();

  await page.getByRole("link", { name: "Open catalog" }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole("heading", { name: "Item catalog" })).toBeVisible();
  await expect(page.getByText("can browse and search only")).toBeVisible();
  await expect(page.getByLabel("Search catalog")).toBeVisible();
  await expect(page.getByText("Dune", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Add item" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save state" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete item" })).toHaveCount(0);
});

test("admin unlock reveals delete controls for a family session", async ({ page }) => {
  const familyPassword = requireE2ESecret("FAMILY_SHELF_FAMILY_PASSWORD");
  const adminPassword = requireE2ESecret("FAMILY_SHELF_ADMIN_PASSWORD");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();

  await chooseFamilyProfile(page, "Kasia");
  await page.getByLabel("Family password").fill(familyPassword);
  await enterSelectedProfile(page);

  await page.getByRole("link", { name: "Admin view" }).click();
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await page.getByLabel("Admin password").fill(adminPassword);
  await page.getByRole("button", { name: "Unlock admin mode" }).click();
  await expect(page.getByRole("heading", { name: "Admin mode unlocked" })).toBeVisible();

  await page.getByRole("link", { name: "Go to items" }).click();
  await expect(page.getByRole("heading", { name: "Item catalog" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete item" }).first()).toBeVisible();
});
