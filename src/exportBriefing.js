import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak, ImageRun,
} from 'docx';
import { LAYOUTS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES, findLayout } from './constants';
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

// ─── META DESCRIPTION GENERATOR ───
function generatePageMetaDescription(page, store) {
  var brand = store.brandName || 'Brand';
  var marketplace = store.marketplace || 'de';
  var products = store.products || [];
  var pageName = page.name || '';
  var isHomepage = pageName.toLowerCase() === 'homepage' || pageName.toLowerCase() === 'home';

  var pageAsins = {};
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      (tile.asins || []).forEach(function(a) { pageAsins[a] = true; });
      if (tile.linkAsin) pageAsins[tile.linkAsin] = true;
      (tile.hotspots || []).forEach(function(hs) { if (hs.asin) pageAsins[hs.asin] = true; });
    });
  });

  var pageProducts = products.filter(function(p) { return pageAsins[p.asin]; });
  var categories = {};
  pageProducts.forEach(function(p) {
    if (p.category) categories[p.category] = (categories[p.category] || 0) + 1;
  });
  var topCategories = Object.keys(categories).sort(function(a, b) { return categories[b] - categories[a]; }).slice(0, 3);

  var keywords = [];
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      if (tile.textOverlay && tile.textOverlay.length > 3 && tile.textOverlay.length < 60) {
        keywords.push(tile.textOverlay);
      }
    });
  });

  var lowerName = pageName.toLowerCase();
  var isAbout = lowerName.indexOf('about') >= 0 || lowerName.indexOf('über') >= 0 || lowerName.indexOf('story') >= 0 || lowerName.indexOf('geschichte') >= 0;
  var isBestseller = lowerName.indexOf('bestseller') >= 0 || lowerName.indexOf('best seller') >= 0 || lowerName.indexOf('top') >= 0;

  var desc = '';

  if (marketplace === 'de' || marketplace === 'at') {
    if (isHomepage) {
      var catText = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'Produkte';
      desc = 'Entdecke ' + brand + ' auf Amazon: ' + catText;
      if (store.heroMessage) {
        desc += '. ' + store.heroMessage.replace(/["„"]/g, '').slice(0, 60);
      } else if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Jetzt den offiziellen ' + brand + ' Store entdecken.';
    } else if (isAbout) {
      desc = 'Erfahre mehr über ' + brand;
      if (store.brandTone) desc += ' — ' + store.brandTone;
      desc += '. Unsere Geschichte, Werte und was uns antreibt. Jetzt auf Amazon entdecken.';
    } else if (isBestseller) {
      desc = 'Die beliebtesten ' + brand + ' Produkte auf Amazon. Top-bewertete Bestseller';
      if (topCategories.length > 0) desc += ' aus ' + topCategories[0];
      desc += '. Jetzt entdecken und bestellen.';
    } else {
      desc = brand + ' ' + pageName + ' auf Amazon entdecken';
      if (pageProducts.length > 0) {
        desc += ': ' + pageProducts.length + ' Produkte';
        if (topCategories.length > 0 && topCategories[0] !== pageName) desc += ' aus ' + topCategories[0];
      }
      if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Jetzt im offiziellen Store shoppen.';
    }
  } else if (marketplace === 'es') {
    if (isHomepage) {
      var catTextEs = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'productos';
      desc = 'Descubre ' + brand + ' en Amazon: ' + catTextEs + '. Explora nuestra colección completa en la tienda oficial.';
    } else if (isAbout) {
      desc = 'Conoce ' + brand + ': nuestra historia, valores y misión. Descubre la marca en Amazon.';
    } else {
      desc = 'Compra ' + brand + ' ' + pageName + ' en Amazon. ';
      if (pageProducts.length > 0) desc += pageProducts.length + ' productos disponibles. ';
      desc += 'Visita la tienda oficial ahora.';
    }
  } else {
    if (isHomepage) {
      var catTextEn = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'products';
      desc = 'Discover ' + brand + ' on Amazon: ' + catTextEn;
      if (store.heroMessage) {
        desc += '. ' + store.heroMessage.replace(/["„"]/g, '').slice(0, 60);
      } else if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Shop the official ' + brand + ' store now.';
    } else if (isAbout) {
      desc = 'Learn about ' + brand;
      if (store.brandTone) desc += ' — ' + store.brandTone;
      desc += '. Our story, values, and what drives us. Discover more on Amazon.';
    } else if (isBestseller) {
      desc = 'Shop ' + brand + '\'s most popular products on Amazon. Top-rated bestsellers';
      if (topCategories.length > 0) desc += ' in ' + topCategories[0];
      desc += '. Browse and order now.';
    } else {
      desc = 'Shop ' + brand + ' ' + pageName + ' on Amazon';
      if (pageProducts.length > 0) {
        desc += ': ' + pageProducts.length + ' products';
        if (topCategories.length > 0 && topCategories[0] !== pageName) desc += ' in ' + topCategories[0];
      }
      if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Visit the official store.';
    }
  }

  if (desc.length > 155) {
    desc = desc.slice(0, 155);
    var lastSpace = desc.lastIndexOf(' ');
    if (lastSpace > 120) desc = desc.slice(0, lastSpace);
    if (!/[.!]$/.test(desc)) desc += '...';
  }

  return desc;
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

    // Background color — only use explicit bgColor, otherwise neutral
    var bgColor = (tile && tile.bgColor) ? tile.bgColor : '#e8ecf0';
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

// Tile fingerprint for duplicate detection
function exportTileFingerprint(tile) {
  if (!tile) return '';
  return [tile.type, tile.brief || '', tile.textOverlay || '', tile.ctaText || '', tile.imageCategory || '', tile.bgColor || '',
    (tile.dimensions || {}).w + 'x' + (tile.dimensions || {}).h,
    (tile.asins || []).join(',')].join('|');
}

function tileDescription(tile, tileIndex, productMap, lang, duplicateNote) {
  var parts = [];
  var typeName = TILE_TYPE_LABELS[tile.type] || tile.type;
  parts.push(new Paragraph({ spacing: { before: 100, after: 40 },
    children: [new TextRun({ text: t('brief.tile', lang) + ' ' + (tileIndex + 1) + ': ' + typeName, bold: true, size: 24, color: '333333' })] }));

  if (duplicateNote) {
    parts.push(new Paragraph({ spacing: { before: 20, after: 40 },
      children: [new TextRun({ text: '\u2753 ' + duplicateNote, bold: true, size: 20, color: '065f46', italics: true })] }));
  }

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
    // Image category
    if (tile.imageCategory && IMAGE_CATEGORIES[tile.imageCategory]) {
      parts.push(boldPara(t('brief.imageCategory', lang) + ': ', IMAGE_CATEGORIES[tile.imageCategory].name));
    }
    var dims = tile.dimensions || {};
    var mDims = tile.mobileDimensions || {};
    if (dims.w) parts.push(boldPara(t('brief.desktop', lang) + ': ', dims.w + ' x ' + dims.h + ' px'));
    if (mDims.w) parts.push(boldPara(t('brief.mobile', lang) + ': ', mDims.w + ' x ' + mDims.h + ' px'));
    if (tile.bgColor) parts.push(boldPara(t('brief.colorPreview', lang) + ': ', tile.bgColor));
    if (tile.textOverlay) {
      var alignHint = tile.textAlign && tile.textAlign !== 'left' ? ' (' + (tile.textAlign === 'center' ? 'zentriert' : 'rechtsbündig') + ')' : '';
      var overlayLines = tile.textOverlay.split('\\n');
      if (overlayLines.length > 1) {
        parts.push(boldPara(t('brief.textOverlay', lang) + alignHint + ': ', ''));
        overlayLines.forEach(function(line) {
          if (line.trim()) parts.push(new Paragraph({ children: [new TextRun({ text: '  • ' + line.trim(), size: 20 })] }));
        });
      } else {
        parts.push(boldPara(t('brief.textOverlay', lang) + ': ', '"' + tile.textOverlay + '"' + alignHint));
      }
    }
    if (tile.ctaText) parts.push(boldPara(t('brief.ctaButton', lang) + ': ', '"' + tile.ctaText + '"'));
    if (tile.brief) {
      // Format brief with bullet points and bold
      var briefLines = tile.brief.split('\n');
      var hasBullets = briefLines.some(function(l) { return /^\s*[-•]\s/.test(l); });
      if (hasBullets) {
        parts.push(new Paragraph({ spacing: { before: 40, after: 20 },
          children: [new TextRun({ text: t('brief.designerBrief', lang) + ':', bold: true, size: 22, color: '475467' })] }));
        briefLines.forEach(function(line) {
          var bulletMatch = line.match(/^\s*[-•]\s+(.*)/);
          var content = bulletMatch ? bulletMatch[1] : line.trim();
          if (!content) return;
          // Parse **bold** and "quoted"
          var runs = [];
          var boldPattern = /(\*\*(.+?)\*\*|"([^"]+)")/g;
          var lastIdx = 0;
          var m;
          while ((m = boldPattern.exec(content)) !== null) {
            if (m.index > lastIdx) runs.push(new TextRun({ text: content.substring(lastIdx, m.index), size: 22 }));
            if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, size: 22 }));
            else if (m[3]) runs.push(new TextRun({ text: '\u201E' + m[3] + '\u201C', italics: true, size: 22 }));
            lastIdx = boldPattern.lastIndex;
          }
          if (lastIdx < content.length) runs.push(new TextRun({ text: content.substring(lastIdx), size: 22 }));
          if (bulletMatch) {
            runs.unshift(new TextRun({ text: '  \u2022 ', size: 22 }));
          }
          parts.push(new Paragraph({ spacing: { before: 10, after: 10 }, children: runs }));
        });
      } else {
        parts.push(boldPara(t('brief.designerBrief', lang) + ': ', tile.brief));
      }
    }
    if (tile.linkAsin) parts.push(boldPara(t('brief.linkAsin', lang) + ': ', tile.linkAsin));
    if ((tile.hotspots || []).length > 0) {
      parts.push(new Paragraph({ spacing: { before: 60, after: 20 },
        children: [
          new TextRun({ text: 'Hotspots (' + tile.hotspots.length + '):', bold: true, size: 22, color: '92400E' }),
          new TextRun({ text: '  ⚠ Amazon UI overlay — NOT part of the image design!', size: 20, color: 'B45309', italics: true }),
        ] }));
      tile.hotspots.forEach(function(hs, i) {
        var productName = '';
        if (hs.asin && productMap && productMap[hs.asin]) productName = ' — ' + (productMap[hs.asin].name || '').slice(0, 40);
        parts.push(new Paragraph({ spacing: { before: 10, after: 10 },
          children: [
            new TextRun({ text: '  ' + (i + 1) + '. ', bold: true, size: 22 }),
            new TextRun({ text: 'Position: ' + (hs.x || 0) + '% / ' + (hs.y || 0) + '%', size: 22 }),
            new TextRun({ text: '  ASIN: ' + (hs.asin || '—'), size: 22, font: 'Courier New' }),
            new TextRun({ text: productName, size: 20, italics: true }),
          ] }));
      });
    }
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

  // ─── HEADER BANNER / STORE HERO ───
  children.push(heading(t('brief.headerBanner', lang), HeadingLevel.HEADING_2));
  children.push(boldPara(t('brief.desktop', lang) + ': ', '3000 x 600 px'));
  children.push(boldPara(t('brief.mobile', lang) + ': ', '1680 x 900 px'));
  children.push(boldPara(t('brief.status', lang) + ': ', store.headerBanner ? t('brief.uploaded', lang) : t('brief.needsDesign', lang)));

  // Find store_hero tile and include its designer instructions
  var heroTile = null;
  (store.pages || []).forEach(function(pg) {
    if (heroTile) return;
    (pg.sections || []).forEach(function(sec) {
      if (heroTile) return;
      (sec.tiles || []).forEach(function(tile) {
        if (!heroTile && tile.imageCategory === 'store_hero') heroTile = tile;
      });
    });
  });
  if (heroTile) {
    if (heroTile.imageCategory && IMAGE_CATEGORIES[heroTile.imageCategory]) {
      children.push(boldPara(t('brief.imageCategory', lang) + ': ', IMAGE_CATEGORIES[heroTile.imageCategory].name));
    }
    if (heroTile.bgColor) children.push(boldPara(t('brief.colorPreview', lang) + ': ', heroTile.bgColor));
    if (heroTile.textOverlay) {
      var heroAlignHint = heroTile.textAlign && heroTile.textAlign !== 'left' ? ' (' + (heroTile.textAlign === 'center' ? 'zentriert' : 'rechtsbündig') + ')' : '';
      children.push(boldPara(t('brief.textOverlay', lang) + ': ', '"' + heroTile.textOverlay + '"' + heroAlignHint));
    }
    if (heroTile.ctaText) children.push(boldPara(t('brief.ctaButton', lang) + ': ', '"' + heroTile.ctaText + '"'));
    if (heroTile.brief) children.push(boldPara(t('brief.designerBrief', lang) + ': ', heroTile.brief));
    children.push(boldPara(t('brief.desktopImage', lang) + ': ', heroTile.uploadedImage ? t('brief.uploaded', lang) : t('brief.needsDesign', lang)));
    children.push(boldPara(t('brief.mobileImage', lang) + ': ', heroTile.uploadedImageMobile ? t('brief.uploaded', lang) : (heroTile.uploadedImage ? t('brief.usesDesktop', lang) : t('brief.needsDesign', lang))));
  }

  children.push(new Paragraph({ children: [new TextRun({ text: t('brief.headerBannerNote', lang), size: 20, color: '666666' })] }));
  children.push(divider());

  // ─── BUILD DUPLICATE MAP ───
  var dupMap = {};
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
        var fp = exportTileFingerprint(tile);
        if (!fp || fp === 'image||||||x|') return;
        if (!dupMap[fp]) {
          dupMap[fp] = { page: pg.name, section: si + 1, tile: ti + 1, count: 1 };
        } else {
          dupMap[fp].count++;
        }
      });
    });
  });

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

    // Meta Description
    var metaDesc = generatePageMetaDescription(page, store);
    if (metaDesc) {
      children.push(new Paragraph({ spacing: { before: 60, after: 20 },
        children: [new TextRun({ text: 'Meta Description:', bold: true, size: 22, color: '15803d' })] }));
      children.push(new Paragraph({ spacing: { before: 0, after: 80 },
        shading: { type: ShadingType.SOLID, color: 'f0fdf4' },
        children: [new TextRun({ text: metaDesc, size: 22, italics: true, color: '1e293b' }),
          new TextRun({ text: '  (' + metaDesc.length + '/155)', size: 18, color: '64748b' })] }));
    }

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
        var fp = exportTileFingerprint(tile);
        var dupInfo = fp && dupMap[fp] && dupMap[fp].count > 1
          && !(dupMap[fp].page === page.name && dupMap[fp].section === si + 1 && dupMap[fp].tile === ti + 1)
          ? 'Identisch mit ' + dupMap[fp].page + ' / Section ' + dupMap[fp].section + ' / Tile ' + dupMap[fp].tile + ' — Bild muss nicht erneut erstellt werden'
          : null;
        tileDescription(tile, ti, productMap, lang, dupInfo).forEach(function(p) { children.push(p); });
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
