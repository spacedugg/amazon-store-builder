// Run once from an authorised server environment after Browser API setup.
// No account provisioning, no data deletion, no production request route.
const {getClient}=require('../api/_db');
const {captureReference}=require('../api/_lib/reference-capture.cjs');
const {browserEndpoint}=require('../api/_lib/browser-capture.cjs');
async function repair() {
  await browserEndpoint(); // Fail before touching the catalogue if setup is missing.
  const db=getClient();
  const rows=(await db.execute('SELECT id,store_url FROM store_reference_captures ORDER BY id')).rows.filter(row=>!row.id.endsWith(':91172724-C342-482B-A300-564D9EA5E09F'));
  const results=[];
  for(const row of rows){
    const started=Date.now();
    const lock=await db.execute({sql:"UPDATE store_reference_captures SET capture_status='capturing',capture_error='',started_at=? WHERE id=? AND (capture_status!='capturing' OR started_at<?)",args:[started,row.id,started-330000]});
    if(!lock.rowsAffected){results.push({id:row.id,status:'busy'});continue;}
    try{
      const result=await captureReference(row.store_url);
      await db.execute({sql:"UPDATE store_reference_captures SET screenshot=?,capture_status='ready',capture_error='',updated_at=CURRENT_TIMESTAMP WHERE id=? AND started_at=?",args:[JSON.stringify(result.screenshot),row.id,started]});
      results.push({id:row.id,status:'ready',height:result.screenshot.height,images:result.screenshot.quality.imageCount});
    }catch(error){
      await db.execute({sql:"UPDATE store_reference_captures SET capture_status='failed',capture_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND started_at=?",args:[error.message.slice(0,400),row.id,started]});
      results.push({id:row.id,status:'failed',error:error.message});
    }
    console.log(JSON.stringify(results.at(-1)));
  }
  return results;
}
if(require.main===module)repair().then(results=>{if(results.some(row=>row.status!=='ready'))process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={repair};
