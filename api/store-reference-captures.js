const { getClient }=require('./_db');
const { verifyAdmin }=require('./_lib/reference-admin.cjs');
const { target,captureReference }=require('./_lib/reference-capture.cjs');
let ready;
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET' && req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt.'});
  if(req.method==='POST'&&!verifyAdmin(req))return res.status(403).json({error:'Bitte die Beispiele im Headquarter als Admin verwalten.'});
  try{
    const db=getClient();
    if(!ready)ready=db.execute(`CREATE TABLE IF NOT EXISTS store_reference_captures (id TEXT PRIMARY KEY,store_url TEXT NOT NULL,brand_name TEXT NOT NULL DEFAULT '',screenshot TEXT,capture_status TEXT NOT NULL DEFAULT 'pending',capture_error TEXT NOT NULL DEFAULT '',started_at INTEGER NOT NULL DEFAULT 0,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).catch(e=>{ready=null;throw e;});
    await ready;
    const rowData=row=>({id:row.id,storeUrl:row.store_url,brandName:row.brand_name,homepageScreenshot:row.screenshot?JSON.parse(row.screenshot):null,alternativeUrls:row.screenshot?[JSON.parse(row.screenshot).sourceUrl]:[],captureStatus:row.capture_status,captureError:row.capture_error});
    if(req.method==='GET')return res.json({stores:(await db.execute('SELECT * FROM store_reference_captures ORDER BY updated_at DESC')).rows.map(rowData)});
    const body=req.body||{}, t=target(body.url), id=t.marketplace+':'+t.pageId.toUpperCase();
    if(body.brandName!==undefined && (typeof body.brandName!=='string'||body.brandName.length>150))throw Error('Markenname ungültig.');
    const now=Date.now();
    await db.execute({sql:`INSERT INTO store_reference_captures(id,store_url,brand_name) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING`,args:[id,t.url,body.brandName?.trim()||'Brand Store']});
    const lock=await db.execute({sql:`UPDATE store_reference_captures SET capture_status='capturing',capture_error='',started_at=?,brand_name=CASE WHEN ?='' THEN brand_name ELSE ? END WHERE id=? AND (capture_status!='capturing' OR started_at<?)`,args:[now,body.brandName?.trim()||'',body.brandName?.trim()||'',id,now-180000]});
    if(!lock.rowsAffected)return res.status(409).json({error:'Für diesen Store läuft bereits eine Aufnahme.'});
    try{
      const result=await captureReference(t.url);
      await db.execute({sql:`UPDATE store_reference_captures SET screenshot=?,brand_name=CASE WHEN ?='' THEN brand_name ELSE ? END,capture_status='ready',capture_error='',updated_at=CURRENT_TIMESTAMP WHERE id=? AND started_at=?`,args:[JSON.stringify(result.screenshot),body.brandName?.trim()||result.brandName||'',body.brandName?.trim()||result.brandName||'',id,now]});
    }catch(error){
      await db.execute({sql:`UPDATE store_reference_captures SET capture_status='failed',capture_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND started_at=?`,args:[error.message.slice(0,400),id,now]});
      return res.status(502).json({error:error.message,store:rowData((await db.execute({sql:'SELECT * FROM store_reference_captures WHERE id=?',args:[id]})).rows[0])});
    }
    return res.json({store:rowData((await db.execute({sql:'SELECT * FROM store_reference_captures WHERE id=?',args:[id]})).rows[0])});
  }catch(error){return res.status(400).json({error:error.message});}
};
