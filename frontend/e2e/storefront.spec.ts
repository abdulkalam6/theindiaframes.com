import { test, expect } from "@playwright/test";

test.describe("The India Frames — Storefront, SEO & Security E2E", () => {
  test("homepage loads with security headers and canonical SEO metadata", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    const headers = response?.headers() ?? {};
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");

    await expect(page).toHaveTitle(/The India Frames/i);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
  });

  test("robots.txt disallows private owner routes and sitemap.xml is valid", async ({
    request,
  }) => {
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain("Disallow: /admin");
    expect(robotsText).toContain("Disallow: /billing");

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain("/products");
  });

  test("catalogue page renders without exposing wholesale prices to visitors", async ({
    page,
  }) => {
    await page.goto("/products");
    await expect(
      page.getByRole("heading", { name: /Catalogue & Supplies/i })
    ).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("wholesale_price_paise");
  });

  test("billing login page loads cleanly", async ({ page }) => {
    await page.goto("/billing/login");
    await expect(
      page.getByRole("heading", { name: /Billing Sign In/i })
    ).toBeVisible();
  });
});
