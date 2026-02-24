import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak,
} from 'docx';
import { LAYOUTS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES } from './constants';

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

function layoutAsciiArt(section) {
  var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
  var tiles = section.tiles || [];
  var parts = [];

  // Desktop layout
  if (layout.stacked) {
    parts.push('Desktop Layout: ' + layout.name);
    if (layout.stacked === 'right') {
      parts.push('┌──────────┬──────┐');
      parts.push('│  T1      │  T2  │');
      parts.push('│ (' + (tiles[0] ? tiles[0].type : '?') + ')├──────┤');
      parts.push('│          │  T3  │');
      parts.push('└──────────┴──────┘');
    } else {
      parts.push('┌──────┬──────────┐');
      parts.push('│  T1  │          │');
      parts.push('├──────┤  T3      │');
      parts.push('│  T2  │ (' + (tiles[2] ? tiles[2].type : '?') + ')│');
      parts.push('└──────┴──────────┘');
    }
  } else {
    var cols = tiles.map(function(t, i) { return ' T' + (i + 1) + ':' + t.type + ' '; });
    parts.push('Desktop: [' + cols.join('|') + ']');
  }
  parts.push('Mobile: tiles stack vertically (top to bottom)');
  return parts.join('\n');
}

function tileDescription(tile, tileIndex, productMap) {
  var parts = [];
  var typeName = TILE_TYPE_LABELS[tile.type] || tile.type;
  parts.push(new Paragraph({ spacing: { before: 100, after: 40 },
    children: [new TextRun({ text: 'Tile ' + (tileIndex + 1) + ': ' + typeName, bold: true, size: 24, color: '333333' })] }));

  if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0) {
    var asins = tile.asins || [];
    parts.push(boldPara('Type: ', typeName));
    parts.push(boldPara('ASINs: ', asins.join(', ') || 'Auto-selected by Amazon'));
    parts.push(boldPara('Product Count: ', String(asins.length)));
    // List product names
    asins.slice(0, 10).forEach(function(a) {
      var p = productMap[a];
      if (p) parts.push(new Paragraph({ spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: '  • ' + a + ' — ' + (p.name || '').slice(0, 60), size: 20, color: '666666' })] }));
    });
    if (asins.length > 10) parts.push(new Paragraph({ children: [new TextRun({ text: '  ... +' + (asins.length - 10) + ' more', size: 20, color: '999999' })] }));
  } else if (tile.type === 'video') {
    parts.push(boldPara('Desktop: ', (tile.dimensions || {}).w + ' x ' + (tile.dimensions || {}).h + ' px'));
    parts.push(boldPara('Mobile: ', (tile.mobileDimensions || {}).w + ' x ' + (tile.mobileDimensions || {}).h + ' px'));
    if (tile.brief) parts.push(boldPara('Brief: ', tile.brief));
    parts.push(boldPara('Thumbnail: ', tile.videoThumbnail ? 'Uploaded' : 'Not set'));
  } else {
    // Image / shoppable / image_text / text
    var dims = tile.dimensions || {};
    var mDims = tile.mobileDimensions || {};
    if (dims.w) parts.push(boldPara('Desktop: ', dims.w + ' x ' + dims.h + ' px'));
    if (mDims.w) parts.push(boldPara('Mobile: ', mDims.w + ' x ' + mDims.h + ' px'));
    if (tile.textOverlay) parts.push(boldPara('Text Overlay: ', '"' + tile.textOverlay + '"'));
    if (tile.ctaText) parts.push(boldPara('CTA Button: ', '"' + tile.ctaText + '"'));
    if (tile.brief) parts.push(boldPara('Designer Brief: ', tile.brief));
    if (tile.linkAsin) parts.push(boldPara('Link ASIN: ', tile.linkAsin));
    if (tile.linkUrl) parts.push(boldPara('Link URL: ', tile.linkUrl));
    parts.push(boldPara('Desktop Image: ', tile.uploadedImage ? 'Uploaded' : 'Needs design'));
    parts.push(boldPara('Mobile Image: ', tile.uploadedImageMobile ? 'Uploaded' : (tile.uploadedImage ? 'Uses desktop' : 'Needs design')));
  }

  return parts;
}

export async function generateBriefingDocx(store) {
  var children = [];
  var productMap = {};
  (store.products || []).forEach(function(p) { productMap[p.asin] = p; });

  // ─── TITLE PAGE ───
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 200 },
    children: [new TextRun({ text: 'Amazon Brand Store Briefing', bold: true, size: 48, color: '232F3E' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: store.brandName || 'Brand Store', bold: true, size: 36, color: 'FF9900' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: 'Date: ' + new Date().toLocaleDateString('de-DE'), size: 24, color: '666666' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: 'Marketplace: Amazon.' + (store.marketplace || 'de'), size: 24, color: '666666' })] }));

  // ─── OVERVIEW ───
  children.push(heading('Overview', HeadingLevel.HEADING_1));
  children.push(boldPara('Pages: ', String((store.pages || []).length)));
  children.push(boldPara('Products: ', String((store.products || []).length)));
  var catNames = (store.pages || []).filter(function(p) { return p.id !== 'homepage'; }).map(function(p) { return p.name; });
  children.push(boldPara('Categories: ', catNames.join(', ') || 'None'));
  if (store.brandTone) children.push(boldPara('Brand Tone: ', store.brandTone));
  if (store.heroMessage) children.push(boldPara('Hero Message: ', '"' + store.heroMessage + '"'));
  children.push(divider());

  // ─── IMPORTANT NOTES ───
  children.push(heading('Image Specifications', HeadingLevel.HEADING_2));
  children.push(new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: 'Each image tile requires TWO versions:', bold: true, size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: '• Desktop version (typically 3000px wide)', size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: '• Mobile version (typically 1242px wide)', size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 40 },
    children: [new TextRun({ text: 'Exact dimensions are specified per tile below. If only one dimension is given, create both versions with appropriate cropping.', size: 20, italics: true, color: '666666' })] }));
  children.push(divider());

  // ─── HEADER BANNER ───
  children.push(heading('Header Banner', HeadingLevel.HEADING_2));
  children.push(boldPara('Desktop: ', '3000 x 600 px'));
  children.push(boldPara('Mobile: ', '1242 x 450 px'));
  children.push(boldPara('Status: ', store.headerBanner ? 'Uploaded' : 'Needs design'));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Shown above the navigation on every page. Can be overridden per page.', size: 20, color: '666666' })] }));
  children.push(divider());

  // ─── PER PAGE ───
  (store.pages || []).forEach(function(page) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(heading('Page: ' + page.name, HeadingLevel.HEADING_1));

    (page.sections || []).forEach(function(section, si) {
      var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
      children.push(heading('Section ' + (si + 1) + ': ' + layout.name, HeadingLevel.HEADING_2));

      // Visual layout representation
      var ascii = layoutAsciiArt(section);
      children.push(new Paragraph({ spacing: { before: 60, after: 60 },
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        children: [new TextRun({ text: ascii, size: 18, font: 'Courier New', color: '555555' })] }));

      // Tile details
      (section.tiles || []).forEach(function(tile, ti) {
        tileDescription(tile, ti, productMap).forEach(function(p) { children.push(p); });
      });
      children.push(divider());
    });
  });

  // ─── ASIN TABLE ───
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading('ASIN Overview', HeadingLevel.HEADING_1));

  var headerRow = new TableRow({
    children: ['ASIN', 'Product Name', 'Category', 'Price', 'Rating', 'Page'].map(function(h) {
      return new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '232F3E' },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })] });
    }),
  });

  // Build page assignment map
  var asinPageMap = {};
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      sec.tiles.forEach(function(t) {
        (t.asins || []).forEach(function(a) { asinPageMap[a] = pg.name; });
      });
    });
  });

  var dataRows = (store.products || []).map(function(p) {
    var catName = '';
    (store.asins || []).forEach(function(a) { if (a.asin === p.asin) catName = a.category || ''; });
    return new TableRow({
      children: [p.asin || '', (p.name || '').slice(0, 40), catName,
        p.price ? (p.currency || '€') + '' + p.price : '', p.rating ? p.rating + ' (' + (p.reviews || 0) + ')' : '',
        asinPageMap[p.asin] || 'Unassigned',
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
