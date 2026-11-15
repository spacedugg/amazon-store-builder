export async function copyStoryText(text, {clipboard=globalThis.navigator?.clipboard, document=globalThis.document}={}) {
  if(clipboard?.writeText) {
    try { await clipboard.writeText(text); return true; } catch {}
  }
  if(!document?.body || !document.execCommand)return false;
  const previous=document.activeElement, field=document.createElement('textarea');
  field.value=text;field.readOnly=true;field.style.position='fixed';field.style.opacity='0';
  document.body.appendChild(field);
  try {field.focus();field.select();return !!document.execCommand('copy');}
  catch{return false;}
  finally{field.remove();previous?.focus?.({preventScroll:true});}
}
