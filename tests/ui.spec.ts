import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3001",
  launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" },
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { success: true } }));
});

test("root renders the login form directly with no intermediate landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to login" })).toHaveCount(0);
});

for (const mustChangePassword of [false, true]) {
  test(`successful login navigates to ${mustChangePassword ? "password change" : "dashboard"}`, async ({ page }) => {
    const destination = mustChangePassword ? "/change-password" : "/dashboard";
    await page.route("**/api/auth/login", (route) => route.fulfill({
      json: { success: true, data: { user: { mustChangePassword } } },
    }));
    await page.route(`**${destination}`, (route) => route.fulfill({
      contentType: "text/html", body: "<main>Signed-in destination</main>",
    }));
    await page.goto("/login");
    await page.getByLabel("Work email").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole("main")).toContainText("Signed-in destination");
  });
}

test("network failure gives a retryable login error", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.abort("failed"));
  await page.goto("/login");
  await page.getByLabel("Work email").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(/connect|connection/i);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
});

test("invalid credentials are shown without leaving the login page", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({
    status: 401, json: { success: false, message: "Invalid credentials." },
  }));
  await page.goto("/login");
  await page.getByLabel("Work email").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Invalid credentials.");
  await expect(page).toHaveURL(/\/login$/);
});

test("database unavailability is actionable and keeps the sign-in form usable", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({
    status: 503, json: { success: false, message: "The database connection is temporarily unavailable. Please try again." },
  }));
  await page.goto("/");
  await page.getByLabel("Work email").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
});

test("mobile login fits the viewport and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByLabel("Work email")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
