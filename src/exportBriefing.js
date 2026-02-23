import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak,
} from 'docx';
import { LAYOUTS } from './constants';

function heading(text, level) {
  return new Paragraph({
    heading: level || HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text: text, bold: true })],
  });
}

function para(text, opts) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun(Object.assign({ text: text, size: 22 }, opts || {}))],
  });
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    children: [new TextRun({ text: '', size: 8 })],
  });
}

function tileDescription(tile, tileIndex) {
  var parts = [];
  parts.push(new Paragraph({
    spacing: { before: 100, after: 40 },
    children: [new TextRun({
      text: 'Tile ' + (tileIndex + 1) + ': ' + tile.type.toUpperCase(),
      bold: true, size: 24, color: '333333',
    })],
  }));

  if (tile.type === 'product_grid') {
    var asins = tile.asins || [];
    parts.push(boldPara('ASINs: ', asins.join(', ') || 'None'));
    parts.push(boldPara('Product Count: ', String(asins.length)));
  } else {
    if (tile.dimensions) {
      parts.push(boldPara('Dimensions: ', tile.dimensions.w + ' x ' + tile.dimensions.h + ' px'));
    }
    if (tile.textOverlay) {
      parts.push(boldPara('Text Overlay: ', '"' + tile.textOverlay + '"'));
    }
    if (tile.ctaText) {
      parts.push(boldPara('CTA Button: ', '"' + tile.ctaText + '"'));
    }
    if (tile.brief) {
      parts.push(boldPara('Designer Brief: ', tile.brief));
    }
  }

  return parts;
}

export async function generateBriefingDocx(store) {
  var children = [];

  // ─── TITLE PAGE ───
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 200 },
    children: [new TextRun({ text: 'Amazon Brand Store Briefing', bold: true, size: 48, color: '232F3E' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: store.brandName || 'Brand Store', bold: true, size: 36, color: 'FF9900' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: 'Date: ' + new Date().toLocaleDateString('de-DE'), size: 24, color: '666666' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: 'Marketplace: Amazon.' + (store.marketplace || 'de'), size: 24, color: '666666' })],
  }));

  // ─── OVERVIEW ───
  children.push(heading('Overview', HeadingLevel.HEADING_1));
  children.push(boldPara('Pages: ', String((store.pages || []).length)));
  children.push(boldPara('Products: ', String((store.products || []).length)));
  var catNames = (store.pages || []).filter(function(p) { return p.id !== 'homepage'; }).map(function(p) { return p.name; });
  children.push(boldPara('Categories: ', catNames.join(', ') || 'None'));
  if (store.brandTone) children.push(boldPara('Brand Tone: ', store.brandTone));
  if (store.heroMessage) children.push(boldPara('Hero Message: ', '"' + store.heroMessage + '"'));
  if (store.brandStory) children.push(boldPara('Brand Story: ', store.brandStory));
  children.push(divider());

  // ─── PER PAGE ───
  (store.pages || []).forEach(function(page) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(heading('Page: ' + page.name, HeadingLevel.HEADING_1));

    (page.sections || []).forEach(function(section, si) {
      var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
      children.push(heading('Section ' + (si + 1) + ': ' + layout.name + ' (' + section.layoutId + ')', HeadingLevel.HEADING_2));

      // Layout visualization
      var cols = (section.tiles || []).map(function(t, i) { return '[Tile ' + (i + 1) + ': ' + t.type + ']'; }).join(' | ');
      children.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        children: [new TextRun({ text: '  ' + cols + '  ', size: 20, font: 'Courier New', color: '555555' })],
      }));

      // Tile details
      (section.tiles || []).forEach(function(tile, ti) {
        var descs = tileDescription(tile, ti);
        descs.forEach(function(p) { children.push(p); });
      });

      children.push(divider());
    });
  });

  // ─── ASIN TABLE ───
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading('ASIN Overview', HeadingLevel.HEADING_1));

  var headerRow = new TableRow({
    children: ['ASIN', 'Product Name', 'Category', 'Price', 'Rating'].map(function(h) {
      return new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '232F3E' },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })],
        })],
      });
    }),
  });

  var dataRows = (store.products || []).map(function(p) {
    var catName = '';
    (store.asins || []).forEach(function(a) {
      if (a.asin === p.asin) catName = a.category || '';
    });
    return new TableRow({
      children: [
        p.asin || '',
        (p.name || '').slice(0, 50),
        catName,
        p.price ? (p.currency || 'EUR') + ' ' + p.price : '',
        p.rating ? p.rating + ' (' + (p.reviews || 0) + ')' : '',
      ].map(function(val) {
        return new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({ text: String(val), size: 18 })],
          })],
        });
      }),
    });
  });

  if (dataRows.length > 0) {
    children.push(new Table({ rows: [headerRow].concat(dataRows) }));
  }

  // ─── BUILD DOCUMENT ───
  var doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 22 },
        },
      },
    },
    sections: [{ children: children }],
  });

  var blob = await Packer.toBlob(doc);
  return blob;
}

export function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
