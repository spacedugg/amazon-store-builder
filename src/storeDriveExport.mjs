const HEADQUARTER = 'https://intern.temoa.de';

export function isDriveFolderLink(value) {
  try {
    const url = new URL(value.trim());
    const match = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/);
    const id = match?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : '');
    const key = url.searchParams.get('resourcekey');
    return url.origin === 'https://drive.google.com' && !url.username && !url.password &&
      /^[A-Za-z0-9_-]{10,150}$/.test(id || '') && (!key || /^[A-Za-z0-9_-]{10,150}$/.test(key));
  } catch {
    return false;
  }
}

export function headquarterDriveRequest(payload, context = window) {
  return new Promise((resolve, reject) => {
    let origin;
    try { origin = new URL(context.document.referrer).origin; } catch { /* opened directly */ }
    if (context.parent === context || origin !== HEADQUARTER) {
      reject(new Error('Öffne den Store Builder im Headquarter und melde dich mit deinem Mitarbeiterkonto an.'));
      return;
    }
    const requestId = context.crypto.randomUUID();
    function unsubscribe() {
      context.clearTimeout(timeout);
      context.removeEventListener('message', receive);
    }
    function receive(event) {
      const data = event.data;
      if (event.source !== context.parent || event.origin !== origin ||
          data?.type !== 'temoa-store-drive-export-result' || data.requestId !== requestId) return;
      unsubscribe();
      if (data.error) reject(new Error(data.error));
      else resolve(data.value);
    }
    const timeout = context.setTimeout(() => {
      unsubscribe();
      reject(new Error('Das Headquarter hat nicht rechtzeitig geantwortet. Bitte den Drive-Export erneut starten.'));
    }, 58000);
    context.addEventListener('message', receive);
    context.parent.postMessage({ type: 'temoa-store-drive-export', requestId, payload }, origin);
  });
}

async function requestWhenAvailable(payload, send) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = await send(payload);
    if (!state?.busy) return state;
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  throw new Error('Für diesen Store läuft bereits ein Drive-Export. Bitte kurz warten.');
}

export async function configureStoreDriveFolder(folderUrl, storeId, send = headquarterDriveRequest) {
  const result = await requestWhenAvailable({ action: 'configure', folderUrl, storeId }, send);
  if (!result?.projectKey) throw new Error('Der Drive-Ordner konnte nicht gespeichert werden.');
  return result;
}

export async function exportSavedStoreImages(storeId, onProgress, send = headquarterDriveRequest) {
  let state = await requestWhenAvailable({ action: 'start', storeId }, send);
  if (state?.needsFolder) return state;
  if (!state?.jobId || !state.projectKey) throw new Error('Der Store-Export konnte nicht gestartet werden.');
  onProgress(state);
  while (state.processed < state.total) {
    const next = await requestWhenAvailable({ action: 'step', jobId: state.jobId, projectKey: state.projectKey }, send);
    if (next?.jobId !== state.jobId || !(next.processed > state.processed)) {
      throw new Error('Die Antwort des Drive-Exports war unvollständig.');
    }
    state = next;
    onProgress(state);
  }
  return state;
}
