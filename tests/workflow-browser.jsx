import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StoreOverview from '../src/components/StoreOverview';
import PatchImportModal from '../src/components/PatchImportModal';
import NewStoreModal from '../src/components/NewStoreModal';
import { applyStorePatch, makeClaudeContext } from '../src/storePatch';
import '../src/index.css';

function Fixture() {
  const [view, setView] = useState('overview');
  const [store, setStore] = useState({ brandName: 'uficell', pages: [{ id: 'home', name: 'Home', sections: [{ id: 'hero', layoutId: '1', tiles: [{ id: 'tile', type: 'image', textOverlay: { heading: 'Manuell bearbeitet' }, uploadedImage: 'existing.webp' }] }] }] });
  window.__workflowRevision = makeClaudeContext(store).baseRevision;
  return <>
    <nav><button onClick={() => setView('overview')}>Übersicht</button><button onClick={() => setView('edit')}>Bearbeiten</button><button onClick={() => setView('new')}>Neuer Store</button></nav>
    <output>{store.pages[0].sections[0].tiles[0].textOverlay.heading}</output>
    {view === 'overview' && <StoreOverview stores={[{ id: 'uficell', brandName: 'uficell', pageCount: 23, savedAt: '2026-11-04 12:00:00' }, { id: 'other', brandName: 'Ohne Feedback', pageCount: 2 }]} onOpen={async () => true} onNewStore={() => setView('new')} />}
    {view === 'edit' && <PatchImportModal store={store} onClose={() => setView('overview')} onApply={data => { const result = applyStorePatch(store, data); setStore(result.store); return result.summary; }} />}
    {view === 'new' && <NewStoreModal onClose={() => setView('overview')} onCreateEmpty={() => {}} onImport={() => {}} />}
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
