// ─── TIMEOUT-AWARE FETCH ───
function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
      reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + ' seconds. Please try again.'));
    }, timeoutMs);
    var fetchOptions = Object.assign({}, options, { signal: controller.signal });
    fetch(url, fetchOptions).then(function(resp) {
      clearTimeout(timer);
      resolve(resp);
    }).catch(function(err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + ' seconds. Please try again.'));
      } else {
        reject(err);
      }
    });
  });
}

var SCRAPE_TIMEOUT_MS = 300000; // 5 minutes — Bright Data can be slow for large ASIN lists

// ─── BRIGHT DATA: Scrape ASINs ───
export async function scrapeAsins(asins, domain) {
  var resp = await fetchWithTimeout('/api/amazon-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asins: asins, domain: domain || 'https://www.amazon.de' }),
  }, SCRAPE_TIMEOUT_MS);
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || e.detail || 'Scrape failed');
  }
  return resp.json();
}

// ─── BRIGHT DATA: Discover all products by brand/seller URL ───
// Two-phase: trigger → poll until complete
export async function discoverBrandProducts(brandUrl, onProgress) {
  var log = onProgress || function() {};

  // Phase 1: Trigger the discovery job
  log('Starting brand discovery...');
  var triggerResp = await fetchWithTimeout('/api/amazon-brand-discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandUrl: brandUrl }),
  }, 30000); // 30s to trigger

  var triggerData = await triggerResp.json();

  if (triggerResp.status !== 202 || !triggerData.snapshotId) {
    throw new Error(triggerData.error || triggerData.detail || 'Failed to start brand discovery');
  }

  var snapshotId = triggerData.snapshotId;
  log('Discovery job started (ID: ' + snapshotId.slice(0, 8) + '...)');

  // Phase 2: Poll for results (max 3 minutes, every 5 seconds)
  var maxPolls = 36;
  var pollInterval = 5000;

  for (var i = 0; i < maxPolls; i++) {
    await new Promise(function(r) { setTimeout(r, pollInterval); });

    log('Checking results... (' + (i + 1) + '/' + maxPolls + ')');

    var pollResp = await fetchWithTimeout('/api/amazon-brand-discover?snapshotId=' + encodeURIComponent(snapshotId), {}, 15000); // 15s per poll
    var pollData = await pollResp.json();

    if (pollData.status === 'complete') {
      log('Found ' + pollData.count + ' products!');
      return pollData;
    }

    if (pollData.status === 'running') {
      continue;
    }

    // Error or unexpected status
    if (pollData.error) {
      throw new Error(pollData.error);
    }
  }

  throw new Error('Brand discovery timed out after 3 minutes. The brand page may have too many products. Try again or paste ASINs manually.');
}

// ─── CRAWL BRAND STORE PAGE: Fetch rendered HTML via Web Unlocker ───
var CRAWL_TIMEOUT_MS = 60000; // 60s — Web Unlocker needs time for JS rendering

export async function crawlBrandStorePage(url) {
  var resp = await fetchWithTimeout('/api/crawl-brand-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url }),
  }, CRAWL_TIMEOUT_MS);
  if (!resp.ok) {
    var ct = resp.headers.get('content-type') || '';
    if (ct.indexOf('text/html') >= 0) {
      throw new Error('API returned HTML instead of JSON (HTTP ' + resp.status + '). The crawl-brand-store endpoint may not be deployed or configured.');
    }
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || 'Failed to crawl brand store page (HTTP ' + resp.status + ')');
  }
  var ct = resp.headers.get('content-type') || '';
  if (ct.indexOf('text/html') >= 0) {
    throw new Error('API returned HTML instead of JSON. Check server deployment.');
  }
  return resp.json();
}

// ─── ANALYZE IMAGES: Send images to Gemini Vision API ───
export async function analyzeStoreImages(images) {
  var resp = await fetchWithTimeout('/api/analyze-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: images }),
  }, 60000);
  var ct = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    if (ct.indexOf('text/html') >= 0) throw new Error('API returned HTML instead of JSON (HTTP ' + resp.status + '). The analyze-images endpoint may not be deployed.');
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || 'Failed to analyze images');
  }
  if (ct.indexOf('text/html') >= 0) throw new Error('API returned HTML instead of JSON. Check server deployment.');
  return resp.json();
}

// ─── GENERATE WIREFRAME IMAGE: Use Gemini/Imagen for tile sketch ───
export async function generateWireframeImage(prompt, aspectRatio) {
  var resp = await fetchWithTimeout('/api/generate-wireframe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, aspectRatio: aspectRatio || '16:9' }),
  }, 30000); // 30s timeout per image
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || 'Failed to generate wireframe image');
  }
  return resp.json();
}

// ─── ANALYZE CI: Extract brand CI from product listing images via Gemini Vision ───
export async function analyzeBrandCI(imageUrls, brandName) {
  var resp = await fetchWithTimeout('/api/analyze-ci', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: imageUrls, brandName: brandName }),
  }, 60000);
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || 'CI analysis failed');
  }
  return resp.json();
}

// ─── SCRAPE BRAND WEBSITE: Extract brand info from online store ───
export async function scrapeWebsite(url) {
  var resp = await fetchWithTimeout('/api/scrape-website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url }),
  }, 30000); // 30s timeout
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || 'Failed to scrape website');
  }
  return resp.json();
}
