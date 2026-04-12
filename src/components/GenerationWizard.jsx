import { useState, useRef, useCallback } from 'react';

// ─── GENERATION WIZARD ───
// Multi-step process with checkpoints where the user can review and adjust.
// Each step runs, shows results, waits for user approval before continuing.
//
// Steps:
//   0. Input (brand, ASINs, website, logo)
//   1. Data Collection (scraping — automatic, no checkpoint)
//   2. Brand Analysis checkpoint (core values, CI, brand voice, store type)
//   3. Categories checkpoint (product grouping, ASIN assignment)
//   4. Content checkpoint (USPs, texts, image concepts per page)
//   5. Page Structure checkpoint (sections, layouts, tile types)
//   6. Generation (automatic — pages generated one by one)
//   7. Done (store displayed)

export default function GenerationWizard({ onComplete, onCancel }) {
  var [step, setStep] = useState(0);
  var [log, setLog] = useState([]);
  var [data, setData] = useState({
    // Step 0: Input
    brand: '',
    marketplace: 'de',
    asins: [],
    websiteUrl: '',
    logoFile: null,
    fontNames: '',
    brandColors: '',
    brandToneExamples: '',
    // Step 1: Scraped data
    products: null,
    websiteData: null,
    productCI: null,
    // Step 2: Brand analysis
    brandVoice: null,
    brandProfile: null,
    storeType: null, // product-showcase, feature-explanation, variant-store, category-navigation
    // Step 3: Categories
    categories: null,
    productAnalyses: null,
    // Step 4: Content
    contentPool: null,
    // Step 5: Structure
    pageStructure: null,
    // Step 6: Generated pages
    generatedPages: null,
  });
  var cancelRef = useRef(false);

  var addLog = useCallback(function(msg) {
    setLog(function(prev) { return prev.concat([msg]); });
  }, []);

  // This is a placeholder — the full wizard UI will be built here
  // For now, render a message showing the step
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
      <h2>Generation Wizard — Step {step}</h2>
      <p>This wizard is being built. Current step: {step}</p>
      <p>Data keys: {Object.keys(data).filter(function(k) { return data[k] !== null && data[k] !== ''; }).join(', ')}</p>
      {log.length > 0 && (
        <pre style={{ background: '#f8fafc', padding: 12, fontSize: 11, maxHeight: 300, overflow: 'auto' }}>
          {log.join('\n')}
        </pre>
      )}
      <button onClick={onCancel} style={{ marginTop: 16, padding: '8px 16px' }}>Close</button>
    </div>
  );
}
