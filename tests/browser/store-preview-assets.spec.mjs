import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const original = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="teal"/></svg>';
const legacyReference = 'data:image/svg+xml;base64,' + Buffer.from(original).toString('base64');
const referenceUrl = 'https://store-images.test/original.svg';
const mobileUrl = 'https://store-images.test/mobile.svg';
const store = {
  brandName: 'Vorschau',
  products: [],
  asins: [],
  pages: [{
    id: 'home',
    name: 'Home',
    sections: [{
      id: 'category-images',
      layoutId: 'vh-4square',
      tiles: [
        { type: 'image', dimensions: { w: 750, h: 750 }, mobileDimensions: { w: 750, h: 1200 }, uploadedImage: legacyReference, uploadedImageMobile: mobileUrl,
          referenceImages: [{ name: 'reference-original.svg', dataUrl: referenceUrl }, { name: 'reference-legacy.svg', dataUrl: legacyReference }] },
        { type: 'shoppable_image', dimensions: { w: 750, h: 750 }, mobileDimensions: { w: 750, h: 300 }, uploadedImage: legacyReference },
        { type: 'image_text', dimensions: { w: 750, h: 750 }, mobileDimensions: { w: 750, h: 1200 }, syncDimensions: true, uploadedImage: legacyReference },
        { type: 'video', dimensions: { w: 750, h: 750 }, mobileDimensions: { w: 750, h: 500 } },
      ],
    }],
  }],
};

async function mockStore(page) {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/stores' && url.search) {
      return route.fulfill({ json: { id: 'fixture', shareToken: 'preview-assets', data: store } });
    }
    return route.fulfill({ json: { stores: [], counts: {}, items: [], feedback: [], totalSeconds: 0, running: false } });
  });
  await page.route(referenceUrl, route => route.fulfill({
    contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: original,
  }));
}

for (const designer of [false, true]) {
  test(`tile dimensions switch immediately in the ${designer ? 'designer briefing' : 'editor'}`, async ({ page }) => {
    await mockStore(page);
    let releaseImage;
    const imageGate = new Promise(resolve => { releaseImage = resolve; });
    await page.route(mobileUrl, async route => {
      await imageGate;
      await route.fulfill({ contentType: 'image/svg+xml', body: original });
    });
    if (!designer) {
      await page.addInitScript(() => sessionStorage.setItem('amazon-store-builder-session', JSON.stringify({ storeId: 'fixture' })));
    }
    await page.goto(designer ? '/share/preview-assets' : '/');
    const tiles = page.locator(designer ? '.briefing-content .section-tiles .tile' : '.canvas .section-tiles .tile');
    const desktop = page.getByRole('button', { name: designer ? 'Desktop' : 'Desktop-Ansicht', exact: true });
    const mobile = page.getByRole('button', { name: designer ? 'Mobile' : 'Mobilansicht', exact: true });
    await expect(tiles).toHaveCount(4);
    const ratios = () => tiles.evaluateAll(nodes => nodes.map(node => {
      const { width, height } = node.getBoundingClientRect();
      return Math.round(100 * height / width);
    }));
    try {
      expect(await ratios()).toEqual([100, 100, 100, 100]);
      await mobile.click();
      expect(await ratios()).toEqual([160, 40, 100, 67]);
      await expect(tiles.first().locator('img')).toHaveAttribute('src', mobileUrl);
    } finally {
      releaseImage();
    }
    await expect.poll(() => tiles.first().locator('img').evaluate(img => img.naturalWidth)).toBe(1200);
    expect(await ratios()).toEqual([160, 40, 100, 67]);
    await desktop.click();
    expect(await ratios()).toEqual([100, 100, 100, 100]);
  });
}

test('designer downloads original bytes directly from each reference thumbnail', async ({ page }) => {
  await mockStore(page);
  await page.goto('/share/preview-assets');
  for (const name of ['reference-original.svg', 'reference-legacy.svg']) {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download ' + name, exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(name);
    expect(await readFile(await download.path(), 'utf8')).toBe(original);
  }
  await page.getByRole('button', { name: 'reference-original.svg', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Reference image' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Reference image' })).toHaveCount(0);
});
