import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportSavedStoreImages, headquarterDriveRequest, isDriveFolderLink } from '../src/storeDriveExport.mjs';

test('accepts Drive folder links and rejects share links to other hosts or to individual files', () => {
  assert(isDriveFolderLink(' https://drive.google.com/drive/u/1/folders/1abcDEF_GhIjK?resourcekey=0-ABCDEFGHIJ '));
  assert(isDriveFolderLink('https://drive.google.com/open?id=1abcDEF_GhIjK'));
  assert(!isDriveFolderLink('https://drive.google.com.example/drive/folders/1abcDEF_GhIjK'));
  assert(!isDriveFolderLink('https://drive.google.com/file/d/1abcDEF_GhIjK'));
});

test('sends only the saved store ID and follows server-side progress', async () => {
  const actions = [];
  const progress = [];
  const job = { jobId: 'test-job', projectKey: 'test-project', total: 2 };
  const send = async payload => {
    actions.push(payload);
    return { ...job, processed: actions.length - 1 };
  };
  const finished = await exportSavedStoreImages('saved-brand', state => progress.push(state.processed), send);
  assert.equal(finished.processed, 2);
  assert.deepEqual(progress, [0, 1, 2]);
  assert.deepEqual(actions, [
    { action: 'start', storeId: 'saved-brand' },
    { action: 'step', jobId: 'test-job', projectKey: 'test-project' },
    { action: 'step', jobId: 'test-job', projectKey: 'test-project' },
  ]);
});

test('an existing store without a folder can be configured before export', async () => {
  const state = await exportSavedStoreImages('legacy', () => assert.fail('no job'), async () => ({ needsFolder: true }));
  assert.equal(state.needsFolder, true);
});

test('only the expected Headquarter parent can respond to a Drive request', async () => {
  const listeners = new Set();
  const parent = { postMessage(message, origin) {
    assert.equal(origin, 'https://intern.temoa.de');
    const reply = { type: 'temoa-store-drive-export-result', requestId: message.requestId, value: { projectKey: 'configured' } };
    for (const listener of listeners) {
      listener({ source: parent, origin: 'https://other.example', data: { ...reply, error: 'forged' } });
      listener({ source: parent, origin, data: reply });
    }
  } };
  const context = { parent, document: { referrer: 'https://intern.temoa.de/embed/store-builder' }, crypto: { randomUUID: () => 'test' },
    setTimeout, clearTimeout, addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener) };
  assert.deepEqual(await headquarterDriveRequest({ action: 'configure' }, context), { projectKey: 'configured' });
  assert.equal(listeners.size, 0);
  await assert.rejects(headquarterDriveRequest({ action: 'configure' }, { ...context, document: { referrer: 'https://other.example' } }), /Headquarter/);
});
