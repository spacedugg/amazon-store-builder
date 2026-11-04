import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/feedback?counts=1', route => route.fulfill({ json: { counts: { uficell: 3 } } }));
  await page.goto('/tests/workflow-browser.html');
});
test('new feedback is visible at the bottom right of the correct store card', async ({ page }, info) => {
  const card = page.getByRole('button', { name: 'uficell öffnen, 3 neue Feedbacks', exact: true });
  const badge = card.locator('.store-home-feedback'); await expect(badge).toHaveText('3');
  const c = await card.boundingBox(), b = await badge.boundingBox();
  expect(b.x).toBeGreaterThan(c.x + c.width / 2); expect(b.y).toBeGreaterThan(c.y + c.height / 2);
  expect(b.x + b.width).toBeLessThan(c.x + c.width); expect(b.y + b.height).toBeLessThan(c.y + c.height);
  await expect(page.getByRole('button', { name: 'Ohne Feedback öffnen', exact: true }).locator('.store-home-feedback')).toHaveCount(0);
  await info.attach('overview', { path: await page.screenshot({ path: info.outputPath('overview.png') }).then(() => info.outputPath('overview.png')), contentType: 'image/png' });
});
for (const viewport of [{ width: 1440, height: 600 }, { width: 390, height: 660 }]) {
  test(`JSON paste and file input stay usable at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const input = page.getByLabel('Änderungs-JSON', { exact: true });
    await input.scrollIntoViewIfNeeded(); const box = await input.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(220); expect(box.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const baseRevision = await page.evaluate(() => window.__workflowRevision);
    await page.locator('input[type=file]').setInputFiles({ name: 'change.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ baseRevision, ops: [{ op: 'modifyTile', pageId: 'home', sectionIdx: 0, tileIdx: 0, patch: { textOverlay: { heading: 'Neue klare Headline' } } }] })) });
    await expect(input).toHaveValue(/Neue klare Headline/);
    await info.attach('json-input', { path: await page.screenshot({ path: info.outputPath('json-input.png') }).then(() => info.outputPath('json-input.png')), contentType: 'image/png' });
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Änderungen anwenden', exact: true }).click();
    await expect(page.locator('output')).toHaveText('Neue klare Headline');
  });
}
test('rejected stale JSON stays editable and does not change existing text', async ({ page }) => {
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const input = page.getByLabel('Änderungs-JSON', { exact: true });
  const baseRevision = await page.evaluate(() => window.__workflowRevision);
  const invalid = JSON.stringify({ baseRevision, ops: [{ op: 'deleteTile', pageId: 'home', sectionIdx: 0, tileIdx: -1 }] });
  await input.fill(invalid); await page.getByRole('button', { name: 'Änderungen anwenden', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Index'); await expect(input).toHaveValue(invalid);
  await expect(page.locator('output')).toHaveText('Manuell bearbeitet');
});
