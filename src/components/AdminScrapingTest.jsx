import { useState } from 'react';

export default function AdminScrapingTest() {
  var [asin, setAsin] = useState('B07L6K4HNC');
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);

  async function runTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      var resp = await fetch('/api/amazon-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asins: [asin.trim()], domain: 'https://www.amazon.de', debug: true }),
      });
      var text = await resp.text();
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ': ' + text.slice(0, 500));
      var data;
      try { data = JSON.parse(text); } catch (e2) { throw new Error('Invalid JSON: ' + text.slice(0, 500)); }
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Scraping Field Test</h1>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
        Enter an ASIN to see ALL fields that BrightData returns. This helps us map the correct fields.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={asin} onChange={function(e) { setAsin(e.target.value); }}
          placeholder="B0XXXXXXXXXX" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'monospace', fontSize: 14 }} />
        <button onClick={runTest} disabled={loading || !asin.trim()}
          style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Testing...' : 'Test'}
        </button>
      </div>

      {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {result && (
        <div>
          {/* Field names */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>
              All fields ({(result.rawFieldNames || []).length}):
            </h3>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(result.rawFieldNames || []).map(function(field) {
                return <span key={field} style={{ fontSize: 11, padding: '2px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: 3, fontFamily: 'monospace', fontWeight: 600 }}>{field}</span>;
              })}
            </div>
          </div>

          {/* Raw data */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>Raw response:</h3>
            <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: 11, overflow: 'auto', maxHeight: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(result.rawSample, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
