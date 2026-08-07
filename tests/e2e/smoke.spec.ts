import { test, expect } from "@playwright/test";
test("login page is reachable", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to your school" })).toBeVisible();
});

test("dashboard requires an authenticated session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("platform operations require an authenticated session", async ({ page }) => {
  await page.goto("/platform");
  await expect(page).toHaveURL(/\/login/);
});
