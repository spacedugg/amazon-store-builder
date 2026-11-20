import { test, expect } from '@playwright/test';
const entries = [12000,18000,9000].map((height,i) => {
  const storeUrl='https://www.amazon.de/stores/page/00000000-0000-0000-0000-'+String(i+1).padStart(12,'0');
  return {brandName:'Capture-Test '+(i+1),storeUrl,homepageScreenshot:{url:'https://capture.fixture.test/'+i+'.png',sourceUrl:storeUrl,capturedAt:'2026-11-20T12:00:00Z',width:1440,height,fullPage:true}};
});
for(const width of [1440,390]) {
  test(`full-page previews keep different natural heights and a dated source at ${width}px`,async({page},info)=>{
    await page.setViewportSize({width,height:900});
    await page.route('**/api/reference-stores',route=>route.fulfill({json:{stores:entries}}));
    await page.route('https://capture.fixture.test/**',route=>{
      const i=Number(new URL(route.request().url()).pathname.split('.')[0].slice(1));
      const h=entries[i].homepageScreenshot.height;
      return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${h}"><rect width="1440" height="${h}" fill="#dbeafe"/><text x="60" y="150" font-size="70">LAYOUT TEST FIXTURE ${i+1}</text><path d="M0 ${h/2}H1440" stroke="#2563eb" stroke-width="20"/></svg>`});
    });
    await page.route('**/api/feedback?counts=1',route=>route.fulfill({json:{counts:{}}}));
    await page.goto('/tests/workflow-browser.html');
    await page.getByRole('button',{name:'Store-Beispiele',exact:true}).click();
    const library=page.getByRole('dialog',{name:'Brand-Store-Beispiele',exact:true});
    await expect.poll(()=>library.locator('.srl-card').count()).toBeGreaterThan(30);
    await library.getByLabel('Beispiele suchen',{exact:true}).fill('Capture-Test');
    await expect(library.locator('.srl-card')).toHaveCount(3);
    const columns=await library.locator('.srl-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width>1000?3:1);
    for(let i=0;i<3;i++) {
      const img=library.getByAltText('Vollständige Homepage: Capture-Test '+(i+1),{exact:true});
      const size=await img.boundingBox();
      expect(Math.abs(size.height/size.width-entries[i].homepageScreenshot.height/1440)).toBeLessThan(.02);
    }
    await expect(library.locator('time').first()).toHaveText('20.11.2026');
    await info.attach('full-page-layout-fixtures',{body:await library.screenshot(),contentType:'image/png'});
    await library.getByRole('button',{name:'Beispiel ansehen: Capture-Test 1',exact:true}).click();
    const full=library.locator('.srl-homepage-figure img');
    const size=await full.boundingBox();
    expect(size.height).toBeGreaterThan(600);
    expect(Math.abs(size.height/size.width-12000/1440)).toBeLessThan(.02);
    await expect(library.locator('.srl-homepage-figure time')).toHaveText('20.11.2026');
    await expect(library.getByRole('link',{name:'Quellseite',exact:true})).toHaveAttribute('href',entries[0].storeUrl);
  });
}
