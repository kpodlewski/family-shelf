import { expect, test } from "@playwright/test";

import { chooseFamilyProfile, enterSelectedProfile, requireE2ESecret } from "./helpers";

test("browser e2e harness can enter with a family profile", async ({ page }) => {
  const familyPassword = requireE2ESecret("FAMILY_SHELF_FAMILY_PASSWORD");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your profile" })).toBeVisible();

  await chooseFamilyProfile(page, "Family profile 1");
  await page.getByLabel("Family password").fill(familyPassword);
  await enterSelectedProfile(page);

  await expect(page.getByText("Family profile 1")).toBeVisible();
  await expect(page.getByText("Catalog updates allowed")).toBeVisible();
});
