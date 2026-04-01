#!/usr/bin/env node
// ─── ADD TILE SIZE INFORMATION TO ALL REFERENCE STORE JSONS ───
//
// Reads each store JSON, looks up the layoutId of each module,
// and adds tileSize + tileDimensions fields to each tile based on
// the LAYOUT_TILE_DIMS mapping from constants.js.
//
// DOES NOT modify constants.js or any layout definitions.
// Only enriches the store JSON files with derived information.
//
// USAGE: node scripts/add-tile-sizes.js

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data', 'reference-stores');

// ─── LAYOUT TILE DIMENSIONS (copied from constants.js, read-only reference) ───
var IMG_TYPES = {
  LARGE_SQUARE: { w: 1500, h: 1500, label: 'Large Square' },
  SMALL_SQUARE: { w: 750, h: 750, label: 'Small Square' },
  WIDE: { w: 1500, h: 750, label: 'Wide' },
  FULL_WIDTH: { w: 3000, h: 600, label: 'Full Width' },
  VH_WIDE: { w: 3000, h: 1500, label: 'VH Wide' },
  VH_SQUARE: { w: 1500, h: 1500, label: 'VH Square' },
};

var I = IMG_TYPES;
var LAYOUT_TILE_DIMS = {
  '1':          [I.FULL_WIDTH],
  'std-2equal': [I.LARGE_SQUARE, I.LARGE_SQUARE],
  'lg-2stack':  [I.LARGE_SQUARE, I.WIDE, I.WIDE],
  '2stack-lg':  [I.WIDE, I.WIDE, I.LARGE_SQUARE],
  'lg-w2s':     [I.LARGE_SQUARE, I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  'w2s-lg':     [I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  '2x2wide':    [I.WIDE, I.WIDE, I.WIDE, I.WIDE],
  'lg-4grid':   [I.LARGE_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-lg':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  '2s-4grid':   [I.WIDE, I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-2s':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.WIDE, I.WIDE],
  '4x2grid':    [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  'vh-2equal':  [I.VH_WIDE, I.VH_WIDE],
  'vh-w2s':     [I.VH_WIDE, I.VH_SQUARE, I.VH_SQUARE],
  'vh-2sw':     [I.VH_SQUARE, I.VH_SQUARE, I.VH_WIDE],
};

// Special layout IDs that don't have image tiles
var NON_IMAGE_LAYOUTS = ['product_grid', 'best_sellers', 'recommended', 'deals'];

function enrichTilesWithSizes(storeJson) {
  var changed = 0;

  if (!storeJson.pages) return changed;

  for (var p = 0; p < storeJson.pages.length; p++) {
    var page = storeJson.pages[p];
    if (!page.modules) continue;

    for (var m = 0; m < page.modules.length; m++) {
      var mod = page.modules[m];
      if (!mod.tiles || mod.tiles.length === 0) continue;

      var layoutId = mod.layoutId;
      if (!layoutId) continue;

      // Skip non-image layouts
      if (NON_IMAGE_LAYOUTS.indexOf(layoutId) >= 0) continue;

      var dims = LAYOUT_TILE_DIMS[layoutId];
      if (!dims) {
        console.log('    WARNING: Unknown layoutId "' + layoutId + '" in module ' + (m + 1));
        continue;
      }

      for (var t = 0; t < mod.tiles.length; t++) {
        var tile = mod.tiles[t];
        if (t < dims.length) {
          var dim = dims[t];
          tile.tilePosition = t + 1;
          tile.tileSize = dim.label;
          tile.tileDimensions = dim.w + 'x' + dim.h;
          changed++;
        }
      }
    }
  }

  return changed;
}

// ─── MAIN ───
var files = fs.readdirSync(DATA_DIR).filter(function(f) {
  return f.endsWith('.json') && !f.startsWith('_');
});

console.log('=== ADD TILE SIZES TO REFERENCE STORE JSONS ===');
console.log('Found ' + files.length + ' store JSON files');
console.log('');

var totalChanged = 0;

for (var i = 0; i < files.length; i++) {
  var filePath = path.join(DATA_DIR, files[i]);
  var storeJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  var changed = enrichTilesWithSizes(storeJson);
  totalChanged += changed;

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(storeJson, null, 2) + '\n');
    console.log('  ✓ ' + files[i] + ': ' + changed + ' tiles enriched');
  } else {
    console.log('  - ' + files[i] + ': no tiles to enrich');
  }
}

console.log('');
console.log('=== DONE: ' + totalChanged + ' tiles enriched across ' + files.length + ' files ===');
