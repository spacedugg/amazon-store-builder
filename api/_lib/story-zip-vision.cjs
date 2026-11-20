async function analyzeZipImages(parts, signal, fetcher=fetch) {
  const failures=[];
  if(process.env.GEMINI_API_KEY){
    try{
      const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
      const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:5000}}),signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])});
      if(!response.ok)throw Error('Gemini HTTP '+response.status);
      const data=await response.json();const text=data.candidates?.[0]?.content?.parts?.filter(part=>!part.thought).map(part=>part.text||'').join('');
      return JSON.parse(text);
    }catch(error){if(signal.aborted)throw error;failures.push(error.message);}
  }
  const key=process.env.CHATGPT_API_KEY||process.env.OPENAI_API_KEY;
  if(key){
    try{
      const content=parts.map(part=>part.text?{type:'input_text',text:part.text}:{type:'input_image',detail:'high',image_url:`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`});
      const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:process.env.STORY_ZIP_OPENAI_MODEL||'gpt-5.4',store:false,input:[{role:'user',content}],text:{format:{type:'json_object'}},reasoning:{effort:'medium'},max_output_tokens:8000}),signal});
      if(!response.ok)throw Error('OpenAI HTTP '+response.status);
      const data=await response.json();const text=(data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');
      return JSON.parse(text);
    }catch(error){if(signal.aborted)throw error;failures.push(error.message);}
  }
  throw Error('Bildanalyse nicht verfügbar. Bitte API-Zugang und Guthaben prüfen.'+(failures.length?' ('+failures.join('; ')+')':''));
}
module.exports={analyzeZipImages};
