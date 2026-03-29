import { useState, useEffect, useCallback } from 'react';
import { AMAZON_CATEGORIES } from '../constants';
import { addStoreToKnowledgeBase, listKnowledgeBaseStores, deleteFromKnowledgeBase } from '../referenceStoreService';
import { SEED_STORES } from '../seedStores';

export default function KnowledgeBaseAdmin({ onClose }) {
  var [stores, setStores] = useState([]);
  var [filterCat, setFilterCat] = useState('all');
  var [loading, setLoading] = useState(false);
  var [crawling, setCrawling] = useState(false);
  var [crawlLog, setCrawlLog] = useState([]);
  var [newUrl, setNewUrl] = useState('');
  var [newCategory, setNewCategory] = useState('generic');
  var [showSeed, setShowSeed] = useState(false);
  var [seedProgress, setSeedProgress] = useState('');

  var loadStores = useCallback(function() {
    setLoading(true);
    listKnowledgeBaseStores(filterCat).then(function(s) {
      setStores(s);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, [filterCat]);

  useEffect(function() { loadStores(); }, [loadStores]);

  var handleAddStore = async function() {
    if (!newUrl || newUrl.indexOf('/stores') < 0) return;
    setCrawling(true);
    setCrawlLog([]);
    try {
      await addStoreToKnowledgeBase(newUrl, newCategory, function(msg) {
        setCrawlLog(function(prev) { return prev.concat([msg]); });
      });
      setNewUrl('');
      loadStores();
    } catch (err) {
      setCrawlLog(function(prev) { return prev.concat(['ERROR: ' + err.message]); });
    }
    setCrawling(false);
  };

  var handleDelete = async function(id) {
    if (!confirm('Delete this reference store?')) return;
    await deleteFromKnowledgeBase(id);
    loadStores();
  };

  var cancelRef = { current: false };

  var handleSeedAll = async function() {
    cancelRef.current = false;
    setCrawling(true);
    setCrawlLog([]);
    var total = SEED_STORES.length;
    for (var i = 0; i < total; i++) {
      if (cancelRef.current) {
        setCrawlLog(function(prev) { return prev.concat(['', '⛔ Crawling cancelled by user']); });
        break;
      }
      var seed = SEED_STORES[i];
      setSeedProgress((i + 1) + '/' + total);
      setCrawlLog(function(prev) { return prev.concat(['', '━━━ Seed Store ' + (i + 1) + '/' + total + ': ' + (seed.brandHint || seed.url.slice(-20)) + ' ━━━']); });
      try {
        await addStoreToKnowledgeBase(seed.url, seed.category, function(msg) {
          setCrawlLog(function(prev) { return prev.concat([msg]); });
        });
        setCrawlLog(function(prev) { return prev.concat(['✓ Saved successfully']); });
      } catch (err) {
        setCrawlLog(function(prev) { return prev.concat(['ERROR: ' + err.message]); });
      }
    }
    setSeedProgress('');
    setCrawling(false);
    loadStores();
  };

  var handleCancel = function() {
    cancelRef.current = true;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Knowledge Base — Reference Stores</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Add new store */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Amazon Brand Store URL..."
            value={newUrl}
            onChange={function(e) { setNewUrl(e.target.value); }}
            style={{ flex: 1, minWidth: 300, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
            disabled={crawling}
          />
          <select value={newCategory} onChange={function(e) { setNewCategory(e.target.value); }} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} disabled={crawling}>
            {AMAZON_CATEGORIES.map(function(cat) {
              return <option key={cat.id} value={cat.id}>{cat.name}</option>;
            })}
          </select>
          <button
            onClick={handleAddStore}
            disabled={crawling || !newUrl}
            style={{ padding: '8px 16px', background: '#0073bb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: crawling ? 0.5 : 1 }}
          >
            {crawling ? 'Crawling...' : 'Add & Crawl'}
          </button>
        </div>

        {/* Seed button */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={function() { setShowSeed(!showSeed); }}
            style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            {showSeed ? 'Hide' : 'Show'} Seed Stores ({SEED_STORES.length})
          </button>
          {showSeed && (
            <button
              onClick={handleSeedAll}
              disabled={crawling}
              style={{ padding: '6px 12px', background: '#ff9900', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: crawling ? 0.5 : 1 }}
            >
              {crawling ? 'Crawling ' + seedProgress + '...' : 'Crawl ALL Seed Stores'}
            </button>
          )}
          {showSeed && crawling && (
            <button
              onClick={handleCancel}
              style={{ padding: '6px 12px', background: '#c00', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              Stop
            </button>
          )}
          {showSeed && !crawling && <span style={{ fontSize: 11, color: '#666' }}>This will crawl {SEED_STORES.length} stores. Takes ~{SEED_STORES.length * 2} minutes.</span>}
        </div>

        {/* Crawl log */}
        {crawlLog.length > 0 && (
          <div style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', maxHeight: 200, overflow: 'auto', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
            {crawlLog.map(function(line, i) { return <div key={i}>{line}</div>; })}
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>Filter:</span>
          <select value={filterCat} onChange={function(e) { setFilterCat(e.target.value); }} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}>
            <option value="all">All Categories</option>
            {AMAZON_CATEGORIES.map(function(cat) {
              return <option key={cat.id} value={cat.id}>{cat.name}</option>;
            })}
          </select>
          <span style={{ fontSize: 12, color: '#999' }}>{stores.length} stores</span>
        </div>

        {/* Store list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>Loading...</div>
        ) : stores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>No reference stores yet. Add one above or use the seed data.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px' }}>Brand</th>
                <th style={{ padding: '8px 4px' }}>Category</th>
                <th style={{ padding: '8px 4px' }}>Pages</th>
                <th style={{ padding: '8px 4px' }}>Images</th>
                <th style={{ padding: '8px 4px' }}>Quality</th>
                <th style={{ padding: '8px 4px' }}>Added</th>
                <th style={{ padding: '8px 4px' }}></th>
              </tr>
            </thead>
            <tbody>
              {stores.map(function(s) {
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 4px', fontWeight: 500 }}>{s.brandName || '—'}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{s.category}</span>
                    </td>
                    <td style={{ padding: '6px 4px' }}>{s.pageCount}</td>
                    <td style={{ padding: '6px 4px' }}>{s.imageCount}</td>
                    <td style={{ padding: '6px 4px' }}>{'★'.repeat(s.qualityScore || 0)}</td>
                    <td style={{ padding: '6px 4px', color: '#999' }}>{s.createdAt ? s.createdAt.slice(0, 10) : ''}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <button onClick={function() { handleDelete(s.id); }} style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 11 }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
