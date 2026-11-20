const HEADQUARTER = 'https://intern.temoa.de';
export function referenceAdminTicket(purpose = 'store-references') {
  if (window.parent === window) return Promise.reject(Error(purpose==='story-zip'?'Bitte im Headquarter mit deinem Mitarbeiterkonto öffnen.':'Bitte im Headquarter als Admin öffnen.'));
  return new Promise((resolve,reject)=>{
    const requestId=crypto.randomUUID();
    const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
    const receive=event=>{
      if(event.source!==window.parent||event.origin!==HEADQUARTER||event.data?.type!=='temoa-store-reference-admin-result'||event.data.requestId!==requestId)return;
      cleanup();event.data.ticket?resolve(event.data.ticket):reject(Error(event.data.error||'Nur Admins können Beispiele verwalten.'));
    };
    const timer=setTimeout(()=>{cleanup();reject(Error('Die Admin-Anmeldung konnte nicht geprüft werden.'));},6000);
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'temoa-store-reference-admin',requestId,purpose},HEADQUARTER);
  });
}
