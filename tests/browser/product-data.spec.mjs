import {test,expect} from '@playwright/test';

const asins=Array.from({length:25},(_,i)=>'B'+String(i).padStart(9,'0'));
const fixture={brandName:'Produkt-Test',marketplace:'de',asins,products:[],pages:[{id:'home',name:'Startseite',sections:[{id:'section',layoutId:'full',tiles:[{id:'tile',type:'product_grid',asins:asins.slice(0,2)}]}]}]};
async function editor(page,failAll=false){
 const state={saves:[],nativeDialogs:[],errors:[]};
 page.on('pageerror',e=>state.errors.push(e.message));
 page.on('dialog',d=>{state.nativeDialogs.push(d.message());return d.dismiss();});
 await page.addInitScript(()=>sessionStorage.setItem('amazon-store-builder-session',JSON.stringify({storeId:'test-store',shareToken:'test-share'})));
 await page.route('**/api/**',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.pathname==='/api/amazon-search'){
   if(failAll)return route.fulfill({status:403,json:{error:'Bright Data error (HTTP 403)',hint:'Zugang abgelehnt'}});
   const requested=request.postDataJSON().asins;
   return route.fulfill({json:{products:requested.includes(asins[0])?[{asin:asins[0],resolvedAsin:'B123456789',image:'https://images.test/a.jpg',price:12.99,name:'Testprodukt',rating:4.5,reviews:12}]:[],failed:requested.filter(a=>a!==asins[0]).map(asin=>({asin,reason:'Produktseite nicht gefunden (404)'}))}});
  }
  if(u.pathname==='/api/stores'){
   if(request.method()==='POST'){state.saves.push(request.postDataJSON().data);return route.fulfill({json:{id:'test-store',shareToken:'test-share'}});}
   return route.fulfill({json:u.searchParams.has('id')?{data:fixture,shareToken:'test-share'}:{stores:[{id:'test-store',brandName:fixture.brandName,pageCount:1,productCount:0}]}});
  }
  return route.fulfill({json:{counts:{},feedback:[],neu:0}});
 });
 await page.route('https://images.test/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>'}));
 await page.route('**/embedded-product-test',route=>route.fulfill({contentType:'text/html',body:'<iframe title="Store Builder" src="http://localhost:4174/?embed=1" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'}));
 await page.goto('/embedded-product-test');
 const ui=page.frameLocator('iframe');
 await expect(ui.getByRole('button',{name:'Speichern',exact:true})).toBeVisible();
 await ui.getByRole('button',{name:/^Mehr/}).click();
 await ui.getByRole('button',{name:/Produktdaten laden/}).click();
 return {...state,ui};
}
test('partial product load followed by save stays mounted past the autosave interval',async({page})=>{
 const state=await editor(page);
 const ui=state.ui;
 await expect(ui.getByRole('status')).toContainText('1 von 25 ASINs geladen');
 await expect(ui.getByRole('status')).toContainText('404');
 await ui.getByRole('button',{name:'Schließen',exact:true}).last().click();
 await ui.getByRole('button',{name:'Speichern',exact:true}).click();
 await expect(ui.getByRole('status')).toContainText('Store gespeichert.');
 await page.waitForTimeout(3500);
 expect(state.nativeDialogs).toEqual([]);expect(state.errors).toEqual([]);
 expect(state.saves).toHaveLength(1);expect(state.saves[0].products).toHaveLength(1);
 await expect(ui.getByRole('button',{name:'Speichern',exact:true})).toBeVisible();
});
test('all failed batches show the real cause and keep a long result dialog usable',async({page})=>{
 const state=await editor(page,true);
 await page.setViewportSize({width:390,height:660});
 const ui=state.ui;
 await expect(ui.getByRole('alert')).toContainText('0 von 25 ASINs geladen');
 await expect(ui.getByRole('alert')).toContainText('403');
 await expect(ui.getByRole('alert')).toContainText('Zugang abgelehnt');
 const close=ui.getByRole('button',{name:'Schließen',exact:true}).last();
 await expect(close).toBeInViewport();await close.click();
 await expect(ui.getByRole('button',{name:'Speichern',exact:true})).toBeVisible();
 expect(state.errors).toEqual([]);
});
