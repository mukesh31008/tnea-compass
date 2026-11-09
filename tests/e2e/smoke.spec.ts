import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoCriticalA11y(page: Page) {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    serious.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    })),
  ).toEqual([]);
}

test("home page renders its primary paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Three paths, one honest record")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /college explorer/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /where you stand/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /open my list/i }).first(),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText(/TNEA Compass/);
});

test("cutoff explorer exposes 2020–2026 coverage", async ({ page }) => {
  await page.goto("/cutoffs?year=2024&community=OC&branch=CS");
  await expect(page.getByText("Published cutoff coverage")).toBeVisible();
  await expect(page.getByRole("link", { name: /^2024/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText(/2024 OC closing marks/)).toBeVisible();
});

test("position reading uses distance language, not prediction language", async ({
  page,
}) => {
  await page.goto("/predictor?mode=cutoff&cutoff=200&community=OC&year=2026");
  await expect(page.getByText(/distance reading, not an admission probability/i)).toBeVisible();
  await expect(page.getByText("Well inside", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Strong signal|Favourable/)).toHaveCount(0);
  await expect(page.getByText(/R3 cumulative close/).first()).toBeVisible();
});

test("college page has breadcrumbs, JSON-LD and a report link", async ({
  page,
}) => {
  await page.goto("/colleges/0001");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  await expect(page.getByRole("link", { name: /report an error/i })).toBeVisible();
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(jsonLd.join(" ")).toContain("CollegeOrUniversity");
  expect(jsonLd.join(" ")).toContain("BreadcrumbList");
});

test("a shared assistant question resolves to a cited answer", async ({
  page,
}) => {
  await page.goto(
    "/assistant?q=What%20was%20the%202026%20OC%20close%20for%20CEG%20Computer%20Science%3F",
  );
  await expect(
    page.getByRole("heading", { name: /College of Engineering, Guindy/i }),
  ).toBeVisible();
  await expect(page.getByText(/Where this comes from/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
});

test("key records pass a serious/critical axe scan", async ({ page }) => {
  await page.goto("/");
  await expectNoCriticalA11y(page);

  await page.goto("/assistant");
  await expectNoCriticalA11y(page);

  await page.goto("/colleges/0001");
  await expectNoCriticalA11y(page);

  await page.goto("/cutoffs");
  await expectNoCriticalA11y(page);

  await page.goto("/compare");
  await expectNoCriticalA11y(page);
});
