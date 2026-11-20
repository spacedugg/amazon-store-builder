import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { referenceKey } from '../src/storeReferences.mjs';

// Imports actual browser captures only. This script neither downloads Amazon
// pages nor manufactures screenshots from archived motifs or page blueprints.
export async function importHomepageScreenshots({ manifestPath, catalogPath, outputDir }) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest) || !manifest.length) throw Error('A nonempty capture manifest is required');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const pending = [];
  const seen = new Set();
  for (const capture of manifest) {
    const key = referenceKey(capture.sourceUrl);
    const entry = catalog.find(r => [r.storeUrl, ...(r.alternativeUrls || [])].some(url => referenceKey(url) === key));
    if (!key || key.startsWith('product:') || !entry) throw Error('Capture source does not match a known Brand Store');
    if (seen.has(entry.id)) throw Error('Duplicate capture for ' + entry.id);
    seen.add(entry.id);
    if (capture.fullPage !== true || !capture.capturedAt || !Number.isFinite(Date.parse(capture.capturedAt))) throw Error('Full-page confirmation and original capture date are required');
    const image = await readFile(resolve(dirname(manifestPath), capture.file));
    if (image.length < 24 || !image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || image.toString('ascii',12,16) !== 'IHDR') throw Error('Capture must be an original PNG file');
    const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
    if (!width || !height) throw Error('Invalid screenshot dimensions');
    const hash = createHash('sha256').update(image).digest('hex').slice(0, 16);
    const filename = entry.id.replace(/[^a-z0-9-]/gi, '-') + '-' + hash + '.png';
    pending.push({ image, filename });
    entry.homepageScreenshot = { url: '/store-homepage-screenshots/' + filename, width, height, fullPage: true, capturedAt: new Date(capture.capturedAt).toISOString(), sourceUrl: capture.sourceUrl };
  }
  // Validate the entire batch before writing any files or catalogue changes.
  await mkdir(outputDir, { recursive: true });
  for (const item of pending) await writeFile(join(outputDir, item.filename), item.image);
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  return pending.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  if (!process.argv[2]) throw Error('Usage: node scripts/import-store-homepage-screenshots.mjs capture-manifest.json');
  const count = await importHomepageScreenshots({ manifestPath: resolve(process.argv[2]), catalogPath: join(root,'src/data/storeReferenceCatalog.json'), outputDir: join(root,'public/store-homepage-screenshots') });
  process.stdout.write('Imported ' + count + ' actual homepage screenshots.\n');
}
