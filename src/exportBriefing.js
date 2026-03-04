import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak, ImageRun,
} from 'docx';
import { LAYOUTS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, findLayout } from './constants';
import { t } from './i18n';

// ─── HELPERS ───

function heading(text, level) {
  return new Paragraph({ heading: level || HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 },
    children: [new TextRun({ text: text, bold: true })] });
}

function boldPara(label, value) {
  return new Paragraph({ spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: label, bold: true, size: 22 }), new TextRun({ text: value, size: 22 })] });
}

function divider() {
  return new Paragraph({ spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    children: [new TextRun({ text: '', size: 8 })] });
}

// ─── LAYOUT CELL POSITIONS ───
// Each cell: [x, y, width, height] as fractions of total dimensions
// Standard layouts (2-row): height ratio 1.0 = full 2-row height
// VH layouts (1-row): height 1.0 = single row
var LAYOUT_CELLS = {
  // Full Width
  '1': [[0, 0, 1, 1]],
  // Standard: 2 Equal (2 Large Squares)
  'std-2equal': [[0, 0, .5, 1], [.5, 0, .5, 1]],
  // Standard: Large + 2 Stacked (LS left + 2W right)
  'lg-2stack': [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]],
  '2stack-lg': [[0, 0, .5, .5], [0, .5, .5, .5], [.5, 0, .5, 1]],
  // Standard: Large + Wide & 2 Small (LS + W + 2SS)
  'lg-w2s': [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .25, .5], [.75, .5, .25, .5]],
  'w2s-lg': [[0, 0, .5, .5], [0, .5, .25, .5], [.25, .5, .25, .5], [.5, 0, .5, 1]],
  // Standard: 4 Equal / 2×2 Wide
  '2x2wide': [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
  // Standard: Large + 2×2 Grid (LS + 4SS)
  'lg-4grid': [[0, 0, .5, 1], [.5, 0, .25, .5], [.75, 0, .25, .5], [.5, .5, .25, .5], [.75, .5, .25, .5]],
  '4grid-lg': [[0, 0, .25, .5], [.25, 0, .25, .5], [0, .5, .25, .5], [.25, .5, .25, .5], [.5, 0, .5, 1]],
  // Standard: 2 Stacked + 2×2 Grid (2W left + 4SS right)
  '2s-4grid': [[0, 0, .5, .5], [0, .5, .5, .5], [.5, 0, .25, .5], [.75, 0, .25, .5], [.5, .5, .25, .5], [.75, .5, .25, .5]],
  '4grid-2s': [[0, 0, .25, .5], [.25, 0, .25, .5], [0, .5, .25, .5], [.25, .5, .25, .5], [.5, 0, .5, .5], [.5, .5, .5, .5]],
  // Standard: 4×2 Grid (8 SS)
  '4x2grid': [[0, 0, .25, .5], [.25, 0, .25, .5], [.5, 0, .25, .5], [.75, 0, .25, .5], [0, .5, .25, .5], [.25, .5, .25, .5], [.5, .5, .25, .5], [.75, .5, .25, .5]],
  // VH: 2 Equal (2 Wides)
  'vh-2equal': [[0, 0, .5, 1], [.5, 0, .5, 1]],
  // VH: Wide + 2 Squares
  'vh-w2s': [[0, 0, .5, 1], [.5, 0, .25, 1], [.75, 0, .25, 1]],
  // VH: 2 Squares + Wide
  'vh-2sw': [[0, 0, .25, 1], [.25, 0, .25, 1], [.5, 0, .5, 1]],
};

// Colors per tile type
var TILE_COLORS = {
  image: '#dbeafe',
  shoppable_image: '#fef3c7',
  image_text: '#e0e7ff',
  product_grid: '#dcfce7',
  best_sellers: '#d1fae5',
  recommended: '#cffafe',
  deals: '#fce7f3',
  video: '#ede9fe',
  text: '#fef9c3',
};

// ─── CANVAS-BASED LAYOUT IMAGE ───
// Renders a section layout as a PNG image using Canvas API

async function renderLayoutImage(section) {
  var layout = findLayout(section.layoutId);
  var tiles = section.tiles || [];
  var cells = LAYOUT_CELLS[layout.id] || LAYOUT_CELLS[layout.grid] || null;

  // Fallback: generate cells for unknown layouts
  if (!cells) {
    var count = tiles.length || 1;
    cells = [];
    for (var ci = 0; ci < count; ci++) {
      cells.push([ci / count, 0, 1 / count, 1]);
    }
  }

  var W = 760;
  var H = 380;
  var gap = 8;

  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  // Draw each cell
  cells.forEach(function(cell, idx) {
    var tile = tiles[idx];

    var cx = Math.round(cell[0] * (W - gap) + gap);
    var cy = Math.round(cell[1] * (H - gap) + gap);
    var cw = Math.round(cell[2] * (W - gap) - gap);
    var ch = Math.round(cell[3] * (H - gap) - gap);

    // Background color
    var bgColor = (tile && tile.bgColor) ? tile.bgColor : (tile ? (TILE_COLORS[tile.type] || '#e2e8f0') : '#e2e8f0');
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    roundRect(ctx, cx, cy, cw, ch, 6);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRect(ctx, cx, cy, cw, ch, 6);
    ctx.stroke();

    // Tile content
    var label = 'T' + (idx + 1);
    var typeName = tile ? (TILE_TYPE_LABELS[tile.type] || tile.type) : '';
    var dims = tile && tile.dimensions ? (tile.dimensions.w + 'x' + tile.dimensions.h) : '';
    var textOv = tile && tile.textOverlay ? ('"' + tile.textOverlay.slice(0, 20) + '"') : '';

    // Contrast-aware text color
    var textColor = getContrastText(bgColor);

    var centerX = cx + cw / 2;
    var centerY = cy + ch / 2;
    var lineH = 18;
    var lines = [label];
    if (typeName) lines.push(typeName);
    if (dims) lines.push(dims);
    if (textOv && ch > 100) lines.push(textOv);

    var startY = centerY - ((lines.length - 1) * lineH) / 2;

    lines.forEach(function(line, li) {
      if (li === 0) {
        ctx.font = 'bold 18px Arial, sans-serif';
      } else if (li === 1) {
        ctx.font = '13px Arial, sans-serif';
      } else {
        ctx.font = '11px Arial, sans-serif';
      }
      ctx.fillStyle = textColor;
      if (li >= 2) ctx.globalAlpha = 0.7;

      // Truncate if wider than cell
      var maxW = cw - 12;
      var txt = line;
      while (ctx.measureText(txt).width > maxW && txt.length > 4) {
        txt = txt.slice(0, -2) + '..';
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, centerX, startY + li * lineH);
      ctx.globalAlpha = 1.0;
    });
  });

  // Convert canvas to PNG Uint8Array
  return new Promise(function(resolve) {
    canvas.toBlob(function(blob) {
      var reader = new FileReader();
      reader.onload = function() {
        resolve(new Uint8Array(reader.result));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

// Rounded rect path helper
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Contrast text color based on background luminance
function getContrastText(hex) {
  if (!hex || hex.charAt(0) !== '#') return '#1e293b';
  var r = parseInt(hex.slice(1, 3), 16) || 0;
  var g = parseInt(hex.slice(3, 5), 16) || 0;
  var b = parseInt(hex.slice(5, 7), 16) || 0;
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1e293b' : '#f8fafc';
}

// ─── TILE DESCRIPTION ───

function tileDescription(tile, tileIndex, productMap, lang) {
  var parts = [];
  var typeName = TILE_TYPE_LABELS[tile.type] || tile.type;
  parts.push(new Paragraph({ spacing: { before: 100, after: 40 },
    children: [new TextRun({ text: t('brief.tile', lang) + ' ' + (tileIndex + 1) + ': ' + typeName, bold: true, size: 24, color: '333333' })] }));

  if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0) {
    var asins = tile.asins || [];
    parts.push(boldPara(t('brief.type', lang) + ': ', typeName));
    parts.push(boldPara('ASINs: ', asins.join(', ') || t('brief.autoSelected', lang)));
    parts.push(boldPara(t('brief.productCount', lang) + ': ', String(asins.length)));
    asins.slice(0, 10).forEach(function(a) {
      var p = productMap[a];
      if (p) parts.push(new Paragraph({ spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: '  ' + a + ': ' + (p.name || '').slice(0, 60), size: 20, color: '666666' })] }));
    });
    if (asins.length > 10) parts.push(new Paragraph({ children: [new TextRun({ text: '  ... +' + (asins.length - 10), size: 20, color: '999999' })] }));
  } else if (tile.type === 'video') {
    parts.push(boldPara(t('brief.desktop', lang) + ': ', (tile.dimensions || {}).w + ' x ' + (tile.dimensions || {}).h + ' px'));
    parts.push(boldPara(t('brief.mobile', lang) + ': ', (tile.mobileDimensions || {}).w + ' x ' + (tile.mobileDimensions || {}).h + ' px'));
    if (tile.brief) parts.push(boldPara(t('brief.brief', lang) + ': ', tile.brief));
    parts.push(boldPara(t('brief.thumbnail', lang) + ': ', tile.videoThumbnail ? t('brief.uploaded', lang) : t('brief.notSet', lang)));
  } else {
    var dims = tile.dimensions || {};
    var mDims = tile.mobileDimensions || {};
    if (dims.w) parts.push(boldPara(t('brief.desktop', lang) + ': ', dims.w + ' x ' + dims.h + ' px'));
    if (mDims.w) parts.push(boldPara(t('brief.mobile', lang) + ': ', mDims.w + ' x ' + mDims.h + ' px'));
    if (tile.bgColor) parts.push(boldPara(t('brief.colorPreview', lang) + ': ', tile.bgColor));
    if (tile.textOverlay) parts.push(boldPara(t('brief.textOverlay', lang) + ': ', '"' + tile.textOverlay + '"'));
    if (tile.ctaText) parts.push(boldPara(t('brief.ctaButton', lang) + ': ', '"' + tile.ctaText + '"'));
    if (tile.brief) parts.push(boldPara(t('brief.designerBrief', lang) + ': ', tile.brief));
    if (tile.linkAsin) parts.push(boldPara(t('brief.linkAsin', lang) + ': ', tile.linkAsin));
    if (tile.linkUrl) parts.push(boldPara(t('brief.linkUrl', lang) + ': ', tile.linkUrl));
    parts.push(boldPara(t('brief.desktopImage', lang) + ': ', tile.uploadedImage ? t('brief.uploaded', lang) : t('brief.needsDesign', lang)));
    parts.push(boldPara(t('brief.mobileImage', lang) + ': ', tile.uploadedImageMobile ? t('brief.uploaded', lang) : (tile.uploadedImage ? t('brief.usesDesktop', lang) : t('brief.needsDesign', lang))));
  }

  return parts;
}

// ─── MAIN EXPORT ───

export async function generateBriefingDocx(store, briefingLang) {
  var lang = briefingLang || 'en';
  var children = [];
  var productMap = {};
  (store.products || []).forEach(function(p) { productMap[p.asin] = p; });

  // ─── TITLE PAGE ───
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 200 },
    children: [new TextRun({ text: t('brief.docTitle', lang), bold: true, size: 48, color: '232F3E' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: store.brandName || 'Brand Store', bold: true, size: 36, color: 'FF9900' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: t('brief.date', lang) + ': ' + new Date().toLocaleDateString('de-DE'), size: 24, color: '666666' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: t('brief.marketplace', lang) + ': Amazon.' + (store.marketplace || 'de'), size: 24, color: '666666' })] }));

  // ─── OVERVIEW ───
  children.push(heading(t('brief.overview', lang), HeadingLevel.HEADING_1));
  children.push(boldPara(t('brief.pages', lang) + ': ', String((store.pages || []).length)));
  children.push(boldPara(t('brief.products', lang) + ': ', String((store.products || []).length)));

  // Show page hierarchy
  var topPages = (store.pages || []).filter(function(p) { return !p.parentId; });
  var pageTree = topPages.map(function(p) {
    var subs = (store.pages || []).filter(function(c) { return c.parentId === p.id; });
    if (subs.length > 0) return p.name + ' (' + subs.map(function(s) { return s.name; }).join(', ') + ')';
    return p.name;
  });
  children.push(boldPara(t('brief.categories', lang) + ': ', pageTree.join(', ') || t('brief.none', lang)));
  if (store.brandTone) children.push(boldPara(t('brief.brandTone', lang) + ': ', store.brandTone));
  if (store.heroMessage) children.push(boldPara(t('brief.heroMessage', lang) + ': ', '"' + store.heroMessage + '"'));
  if (store.category && store.category !== 'generic') children.push(boldPara(t('brief.niche', lang) + ': ', store.category));
  children.push(divider());

  // ─── IMAGE SPECIFICATIONS ───
  children.push(heading(t('brief.imageSpecs', lang), HeadingLevel.HEADING_2));
  children.push(new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: t('brief.twoVersions', lang), bold: true, size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: t('brief.desktopVersion', lang), size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: t('brief.mobileVersion', lang), size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 40 },
    children: [new TextRun({ text: t('brief.dimensionsNote', lang), size: 20, italics: true, color: '666666' })] }));
  children.push(divider());

  // ─── HEADER BANNER ───
  children.push(heading(t('brief.headerBanner', lang), HeadingLevel.HEADING_2));
  children.push(boldPara(t('brief.desktop', lang) + ': ', '3000 x 600 px'));
  children.push(boldPara(t('brief.mobile', lang) + ': ', '1242 x 450 px'));
  children.push(boldPara(t('brief.status', lang) + ': ', store.headerBanner ? t('brief.uploaded', lang) : t('brief.needsDesign', lang)));
  children.push(new Paragraph({ children: [new TextRun({ text: t('brief.headerBannerNote', lang), size: 20, color: '666666' })] }));
  children.push(divider());

  // ─── PER PAGE ───
  for (var pi = 0; pi < (store.pages || []).length; pi++) {
    var page = store.pages[pi];
    children.push(new Paragraph({ children: [new PageBreak()] }));
    var pageTitle = t('brief.page', lang) + ': ' + page.name;
    if (page.parentId) {
      var parentPage = (store.pages || []).find(function(p) { return p.id === page.parentId; });
      if (parentPage) pageTitle = t('brief.subPage', lang) + ': ' + page.name + ' (' + parentPage.name + ')';
    }
    children.push(heading(pageTitle, HeadingLevel.HEADING_1));

    for (var si = 0; si < (page.sections || []).length; si++) {
      var section = page.sections[si];
      var layout = findLayout(section.layoutId);
      children.push(heading(t('brief.section', lang) + ' ' + (si + 1) + ': ' + layout.name, HeadingLevel.HEADING_2));

      // ─── WIREFRAME IMAGE ───
      children.push(new Paragraph({ spacing: { before: 60, after: 30 },
        children: [new TextRun({ text: t('brief.layoutPattern', lang) + ':', bold: true, size: 20, color: '475467' })] }));

      try {
        var imageData = await renderLayoutImage(section);
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({
            data: imageData,
            transformation: { width: 580, height: 290 },
            type: 'png',
          })],
        }));
      } catch (e) {
        // Fallback text if canvas rendering fails
        children.push(new Paragraph({ children: [new TextRun({ text: '[' + layout.name + ' - ' + layout.cells + ' tiles]', size: 20, color: '999999' })] }));
      }

      children.push(new Paragraph({ spacing: { before: 20, after: 40 },
        children: [new TextRun({ text: t('brief.mobileStacking', lang), size: 18, italics: true, color: '999999' })] }));

      // Tile details
      (section.tiles || []).forEach(function(tile, ti) {
        tileDescription(tile, ti, productMap, lang).forEach(function(p) { children.push(p); });
      });
      children.push(divider());
    }
  }

  // ─── ASIN TABLE ───
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading(t('brief.asinOverview', lang), HeadingLevel.HEADING_1));

  var headerLabels = ['ASIN', t('brief.productName', lang), t('brief.category', lang), t('brief.price', lang), t('brief.rating', lang), t('brief.page', lang)];
  var headerRow = new TableRow({
    children: headerLabels.map(function(h) {
      return new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '232F3E' },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })] });
    }),
  });

  var asinPageMap = {};
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      sec.tiles.forEach(function(tl) {
        (tl.asins || []).forEach(function(a) { asinPageMap[a] = pg.name; });
      });
    });
  });

  var dataRows = (store.products || []).map(function(p) {
    var catName = '';
    (store.asins || []).forEach(function(a) { if (a.asin === p.asin) catName = a.category || ''; });
    return new TableRow({
      children: [p.asin || '', (p.name || '').slice(0, 40), catName,
        p.price ? (p.currency || 'EUR') + '' + p.price : '', p.rating ? p.rating + ' (' + (p.reviews || 0) + ')' : '',
        asinPageMap[p.asin] || t('brief.unassigned', lang),
      ].map(function(val) {
        return new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: String(val), size: 16 })] })] });
      }),
    });
  });

  if (dataRows.length > 0) children.push(new Table({ rows: [headerRow].concat(dataRows) }));

  // ─── BUILD DOCUMENT ───
  var doc = new Document({
    styles: { default: { document: { run: { font: 'Segoe UI', size: 22 } } } },
    sections: [{ children: children }],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
