import { exampleData } from './brandStoryExamples.mjs';
export async function saveStoryExample(draft) {
  const data=exampleData(draft.data),controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch('/api/brand-story-examples',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({...draft,data})});
    let result;try{result=await response.json();}catch{throw Error('Beispiel konnte nicht gespeichert werden. Bitte erneut versuchen.');}
    if(!response.ok)throw Error(result.error||'Beispiel konnte nicht gespeichert werden.');
    if(typeof result.id!=='string'||!Number.isInteger(result.revision))throw Error('Speichern wurde nicht bestätigt. Bitte erneut versuchen.');
    return {...draft,...result,data};
  }catch(error){if(error.name==='AbortError')throw Error('Speichern wurde nicht bestätigt. Die importierten Daten bleiben erhalten. Bitte erneut versuchen.');throw error;}
  finally{clearTimeout(timeout);}
}
