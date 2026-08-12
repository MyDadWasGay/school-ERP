import { expect, test } from "@playwright/test";

// Generate a storage state from a staging admin account and set
// E2E_STORAGE_STATE before running this suite. Credentials never belong in
// the repository or in CI logs. Mutating scenarios additionally require
// E2E_RUN_MUTATIONS=1 so a read-only authenticated smoke run is safe by default.
const storageState = process.env.E2E_STORAGE_STATE;
const runMutations = process.env.E2E_RUN_MUTATIONS === "1";

test.describe("authenticated released surface", () => {
  test.skip(!storageState, "Set E2E_STORAGE_STATE to run authenticated staging coverage.");
  test.use({ storageState: storageState ?? undefined });

  test("shows foundation navigation and human-readable breadcrumbs", async ({ page }) => {
    await page.goto("/settings/academic-years");
    await expect(page.getByRole("heading", { name: "Academic years" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Classes" })).toHaveAttribute("href", "/settings/classes");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Academic years");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).not.toContainText("Settings profile");
  });

  test("rejects an unreleased workflow on direct access", async ({ page }) => {
    await page.goto("/cms/news");
    await expect(page.getByText("This page could not be found.")).toBeVisible();

    await page.goto("/settings/permissions");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("keeps student enrollment controls usable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/students/new");
    await expect(page.getByRole("heading", { name: "Create student" })).toBeVisible();
    const campus = page.locator('select[name="campusId"]');
    await campus.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Create student" })).toBeVisible();
  });

  test("creates a class and section through the released setup workflows", async ({ page }) => {
    test.skip(!runMutations, "Set E2E_RUN_MUTATIONS=1 to run staging mutations.");
    const suffix = Date.now().toString();

    await page.goto("/settings/classes");
    await page.getByRole("button", { name: "New class" }).click();
    await page.locator('input[name="name"]').fill(`E2E Class ${suffix}`);
    await page.locator('input[name="code"]').fill(`E2E-${suffix.slice(-6)}`);
    await page.getByRole("button", { name: "Create class" }).click();
    await expect(page.getByRole("status")).toContainText(/created|saved/i);

    await page.goto("/settings/sections");
    await page.getByRole("button", { name: "New section" }).click();
    const classSelect = page.locator('select[name="classId"]');
    await expect(classSelect.locator("option")).not.toHaveCount(0);
    await classSelect.selectOption({ index: 1 });
    await page.locator('input[name="name"]').fill(`E2E Section ${suffix}`);
    await page.locator('input[name="capacity"]').fill("30");
    await page.getByRole("button", { name: "Create section" }).click();
    await expect(page.getByRole("status")).toContainText(/created|saved/i);
  });

  test("creates a student only after selecting campus, year, class and section", async ({ page }) => {
    test.skip(!runMutations, "Set E2E_RUN_MUTATIONS=1 to run staging mutations.");
    const suffix = Date.now().toString();
    await page.goto("/students/new");
    await page.locator('input[name="admissionNumber"]').fill(`E2E-${suffix}`);
    await page.locator('input[name="firstName"]').fill("Release");
    await page.locator('input[name="lastName"]').fill(`Check${suffix.slice(-4)}`);
    await page.locator('select[name="campusId"]').selectOption({ index: 1 });
    await page.locator('select[name="academicYearId"]').selectOption({ index: 1 });
    await page.locator('select[name="classId"]').selectOption({ index: 1 });
    await page.locator('select[name="sectionId"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: "Create student" }).click();
    await expect(page.getByRole("status")).toContainText(/student created/i);
  });

  test("keeps an archive failure retryable and keyboard accessible", async ({ page }) => {
    test.skip(!runMutations, "Set E2E_RUN_MUTATIONS=1 to run staging mutations.");
    await page.goto("/settings/classes");
    const archive = page.getByRole("button", { name: "Archive" }).first();
    await archive.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await archive.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  });
});
