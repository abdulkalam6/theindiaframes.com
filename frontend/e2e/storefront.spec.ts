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

  test("enhanced homepage renders all sections, valid internal links, FAQ, and Add to Cart", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    // Key sections visible
    await expect(
      page.getByRole("heading", { name: /Where Memories Become Art/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Explore Our Complete Catalogue/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Featured Products/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Shop by Occasion/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Trade Supply for Framing & Printing Businesses/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Frequently Asked Questions/i })
    ).toBeVisible();

    // Verify all internal hrefs on homepage return HTTP 200
    const hrefs = await page
      .locator('main a[href^="/"]')
      .evaluateAll((els) =>
        Array.from(
          new Set(
            els
              .map((el) => el.getAttribute("href"))
              .filter((h): h is string => Boolean(h) && !h.startsWith("/#"))
          )
        )
      );
    expect(hrefs.length).toBeGreaterThan(5);
    for (const path of hrefs) {
      const res = await request.get(path);
      expect(res.status(), `Dead homepage link: ${path}`).toBe(200);
    }

    // Test Add to Cart from Featured Products if live products are loaded
    const addButtons = page.getByRole("button", { name: /Add to Cart/i });
    if ((await addButtons.count()) > 0) {
      await addButtons.first().click();
      await expect(page.getByLabel("Enquiry Cart")).toContainText("1");
    }

    // Test FAQ accordion toggle
    const secondFaq = page.getByRole("button", {
      name: /How can I apply for a wholesale account\?/i,
    });
    await secondFaq.click();
    await expect(secondFaq).toHaveAttribute("aria-expanded", "true");

    // Verify responsive layout (no horizontal overflow)
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});
