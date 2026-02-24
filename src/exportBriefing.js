import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak, TableLayoutType, VerticalAlign,
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

// ─── LAYOUT PATTERN VISUAL TABLE ───
// Creates a table-based visual showing how tiles are arranged in the section
function layoutPatternTable(section) {
  var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
  var tiles = section.tiles || [];
  var g = layout.grid;
  var cellBorder = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
  var borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  function tileCell(idx, rowSpan, colSpan, widthPct) {
    var tile = tiles[idx];
    var label = tile ? ('T' + (idx + 1)) : '?';
    var typeName = tile ? (TILE_TYPE_LABELS[tile.type] || tile.type) : '';
    var dims = tile && tile.dimensions ? (tile.dimensions.w + 'x' + tile.dimensions.h) : '';
    var briefShort = tile && tile.brief ? tile.brief.slice(0, 40) : '';
    var textOv = tile && tile.textOverlay ? ('"' + tile.textOverlay.slice(0, 30) + '"') : '';
    var colorHint = tile && tile.bgColor ? ('[Color: ' + tile.bgColor + ']') : '';

    var children = [
      new Paragraph({ spacing: { before: 40, after: 20 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, size: 22, color: 'FF9900' })] }),
      new Paragraph({ spacing: { after: 20 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: typeName, size: 16, color: '666666' })] }),
    ];
    if (dims) {
      children.push(new Paragraph({ spacing: { after: 10 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: dims, size: 14, color: '999999', font: 'Courier New' })] }));
    }
    if (textOv) {
      children.push(new Paragraph({ spacing: { after: 10 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: textOv, size: 14, italics: true, color: '333333' })] }));
    }
    if (briefShort) {
      children.push(new Paragraph({ spacing: { after: 10 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: briefShort, size: 12, color: '888888' })] }));
    }
    if (colorHint) {
      children.push(new Paragraph({ spacing: { after: 10 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: colorHint, size: 12, color: '6644AA' })] }));
    }

    var cellProps = {
      children: children,
      borders: borders,
      shading: { type: ShadingType.SOLID, color: tile && tile.bgColor ? tile.bgColor.replace('#', '') : 'F8F8F8' },
      verticalAlign: VerticalAlign.CENTER,
      width: { size: widthPct, type: WidthType.PERCENTAGE },
    };
    if (rowSpan && rowSpan > 1) cellProps.rowSpan = rowSpan;
    if (colSpan && colSpan > 1) cellProps.columnSpan = colSpan;
    return new TableCell(cellProps);
  }

  function emptyCell(widthPct) {
    return new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '', size: 8 })] })],
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      width: { size: widthPct, type: WidthType.PERCENTAGE },
    });
  }

  var rows = [];

  // Build grid based on layout type
  if (g === 'lg-2stack') {
    // Row 1: T1(large, rowSpan 2) | T2
    // Row 2: (merged)             | T3
    rows.push(new TableRow({ children: [tileCell(0, 2, 1, 66), tileCell(1, 1, 1, 34)] }));
    rows.push(new TableRow({ children: [tileCell(2, 1, 1, 34)] }));

  } else if (g === '2stack-lg') {
    rows.push(new TableRow({ children: [tileCell(0, 1, 1, 34), tileCell(2, 2, 1, 66)] }));
    rows.push(new TableRow({ children: [tileCell(1, 1, 1, 34)] }));

  } else if (g === 'lg-4grid') {
    // Row 1: T1(large, rowSpan 2) | T2 | T3
    // Row 2: (merged)             | T4 | T5
    rows.push(new TableRow({ children: [tileCell(0, 2, 1, 50), tileCell(1, 1, 1, 25), tileCell(2, 1, 1, 25)] }));
    rows.push(new TableRow({ children: [tileCell(3, 1, 1, 25), tileCell(4, 1, 1, 25)] }));

  } else if (g === '4grid-lg') {
    rows.push(new TableRow({ children: [tileCell(0, 1, 1, 25), tileCell(1, 1, 1, 25), tileCell(4, 2, 1, 50)] }));
    rows.push(new TableRow({ children: [tileCell(2, 1, 1, 25), tileCell(3, 1, 1, 25)] }));

  } else if (g === 'lg-6grid') {
    // Row 1: T1(large, rowSpan 3) | T2 | T3
    // Row 2: (merged)             | T4 | T5
    // Row 3: (merged)             | T6 | T7
    rows.push(new TableRow({ children: [tileCell(0, 3, 1, 50), tileCell(1, 1, 1, 25), tileCell(2, 1, 1, 25)] }));
    rows.push(new TableRow({ children: [tileCell(3, 1, 1, 25), tileCell(4, 1, 1, 25)] }));
    rows.push(new TableRow({ children: [tileCell(5, 1, 1, 25), tileCell(6, 1, 1, 25)] }));

  } else if (g === '6grid-lg') {
    rows.push(new TableRow({ children: [tileCell(0, 1, 1, 25), tileCell(1, 1, 1, 25), tileCell(6, 3, 1, 50)] }));
    rows.push(new TableRow({ children: [tileCell(2, 1, 1, 25), tileCell(3, 1, 1, 25)] }));
    rows.push(new TableRow({ children: [tileCell(4, 1, 1, 25), tileCell(5, 1, 1, 25)] }));

  } else {
    // Simple row layout (1, 1-1, 1-1-1, 1-1-1-1, 2-1, 1-2, 2-1-1, 1-1-2)
    var colCount = tiles.length || 1;
    var cellWidth = Math.floor(100 / colCount);
    var rowCells = tiles.map(function(t, i) {
      return tileCell(i, 1, 1, cellWidth);
    });
    if (rowCells.length > 0) {
      rows.push(new TableRow({ children: rowCells }));
    }
  }

  if (rows.length === 0) return null;

  return new Table({
    rows: rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });
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
    asins.slice(0, 10).forEach(function(a) {
      var p = productMap[a];
      if (p) parts.push(new Paragraph({ spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: '  ' + a + ': ' + (p.name || '').slice(0, 60), size: 20, color: '666666' })] }));
    });
    if (asins.length > 10) parts.push(new Paragraph({ children: [new TextRun({ text: '  ... +' + (asins.length - 10) + ' more', size: 20, color: '999999' })] }));
  } else if (tile.type === 'video') {
    parts.push(boldPara('Desktop: ', (tile.dimensions || {}).w + ' x ' + (tile.dimensions || {}).h + ' px'));
    parts.push(boldPara('Mobile: ', (tile.mobileDimensions || {}).w + ' x ' + (tile.mobileDimensions || {}).h + ' px'));
    if (tile.brief) parts.push(boldPara('Brief: ', tile.brief));
    parts.push(boldPara('Thumbnail: ', tile.videoThumbnail ? 'Uploaded' : 'Not set'));
  } else {
    var dims = tile.dimensions || {};
    var mDims = tile.mobileDimensions || {};
    if (dims.w) parts.push(boldPara('Desktop: ', dims.w + ' x ' + dims.h + ' px'));
    if (mDims.w) parts.push(boldPara('Mobile: ', mDims.w + ' x ' + mDims.h + ' px'));
    if (tile.bgColor) parts.push(boldPara('Color Preview: ', tile.bgColor));
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
  if (store.category && store.category !== 'generic') children.push(boldPara('Niche: ', store.category));
  children.push(divider());

  // ─── IMPORTANT NOTES ───
  children.push(heading('Image Specifications', HeadingLevel.HEADING_2));
  children.push(new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: 'Each image tile requires TWO versions:', bold: true, size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Desktop version (typically 3000px wide)', size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Mobile version (typically 1242px wide)', size: 22 })] }));
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

      // ─── VISUAL LAYOUT PATTERN TABLE ───
      children.push(new Paragraph({ spacing: { before: 60, after: 30 },
        children: [new TextRun({ text: 'Layout Pattern:', bold: true, size: 20, color: '475467' })] }));

      var patternTable = layoutPatternTable(section);
      if (patternTable) {
        children.push(patternTable);
      }

      children.push(new Paragraph({ spacing: { before: 20, after: 40 },
        children: [new TextRun({ text: 'Mobile: tiles stack vertically (top to bottom)', size: 18, italics: true, color: '999999' })] }));

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
        p.price ? (p.currency || 'EUR') + '' + p.price : '', p.rating ? p.rating + ' (' + (p.reviews || 0) + ')' : '',
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
