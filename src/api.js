// ─── BRIGHT DATA: Scrape ASINs ───
export async function scrapeAsins(asins, domain) {
  var resp = await fetch('/api/amazon-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asins: asins, domain: domain || 'https://www.amazon.de' }),
  });
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
  var triggerResp = await fetch('/api/amazon-brand-discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandUrl: brandUrl }),
  });

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

    var pollResp = await fetch('/api/amazon-brand-discover?snapshotId=' + encodeURIComponent(snapshotId));
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
