import { test, expect } from "@playwright/test";
const asset = {
  url: "https://example.com/image.png",
  width: 3660,
  height: 1563,
  size: 1000,
};
const story = {
  schemaVersion: 1,
  brandName: "Story-Test",
  marketplace: "de",
  language: "de",
  instructions: "PRIVATE-INSTRUCTIONS",
  brandFacts: "",
  background: {
    desktop: asset,
    mobile: { ...asset, width: 1389, height: 1875 },
    brief: "",
    copy: "",
  },
  references: [],
  cards: Array.from({ length: 7 }, (_, i) => ({
    id: "c" + i,
    fileKey: "card-0" + (i + 1),
    type: "media",
    brief: "",
    copy: "",
    image: { ...asset, width: 814, height: 1019 },
    slots: [],
  })),
};
test("editor cards move over a stationary background, mobile changes step, instructions import is available", async ({
  page,
}) => {
  await page.route("**/api/brand-stories*", (r) =>
    r.fulfill({ json: { stories: [] } }),
  );
  await page.addInitScript(
    (s) =>
      sessionStorage.setItem(
        "brand-story-draft",
        JSON.stringify({ story: s, record: {} }),
      ),
    story,
  );
  await page.goto("/brand-stories");
  await page.getByRole("button", { name: "Letzten Entwurf fortsetzen" }).click();
  await expect(page.getByRole("heading", { name: "Story-Test", exact: true }).first()).toBeVisible();
  const bg = page.locator(".bs-backdrop");
  const relativeBox = () =>
    bg.evaluate((el) => {
      const r = el.getBoundingClientRect(),
        p = el.closest(".bs-carousel").getBoundingClientRect();
      return { x: r.x - p.x, y: r.y - p.y, width: r.width, height: r.height };
    });
  await page.evaluate(() => document.fonts.ready);
  const before = await relativeBox();
  await page.getByRole("button", { name: "Nächste Karten" }).click();
  await expect(page.locator(".bs-counter")).toHaveText("2 / 3");
  await expect(page.locator(".bs-rail")).toHaveAttribute("style", /80.34/);
  expect(await relativeBox()).toEqual(before);
  await page.getByRole("button", { name: "Mobil", exact: true }).click();
  await expect(page.locator(".bs-counter")).toHaveText("1 / 7");
  await page.locator(".bs-carousel").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".bs-counter")).toHaveText("2 / 7");
  await page.getByRole("button", { name: "Karte hinzufügen", exact: true }).click();
  await page.getByRole("button", { name: "ASIN-Grid", exact: true }).click();
  await expect(
    page.getByLabel("Grid-Überschrift", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Grid-Überschrift", { exact: true }).fill("Produkte");
  await expect(page.locator('.bs-counter')).toHaveText('8 / 8');
  await expect(page.getByText("Produkte", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Konzept mit Claude", exact: true }).click();
  await expect(page.getByLabel("Brand Story JSON")).toBeVisible();
  await page.screenshot({
    path: "test-results/brand-story-editor.png",
    fullPage: true,
  });
});
test("customer token opens preview without editor or internal panels", async ({
  page,
}) => {
  await page.route("**/api/brand-stories*", (r) =>
    r.fulfill({ json: { mode: "customer", data: story } }),
  );
  await page.goto("/brand-stories?token=customer");
  await expect(page.locator(".bs-carousel")).toBeVisible();
  await expect(page.getByText("PRIVATE-INSTRUCTIONS")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Neue Brand Story" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "JSON-Import" })).toHaveCount(
    0,
  );
});
