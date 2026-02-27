#!/usr/bin/env node
/**
 * Create a fresh "Design vs Code — Parity Board" section in Figma
 * with side-by-side: Figma design clone | Code widget screenshot
 * 
 * Uses real Figma widget comps from "Ecommerce Widgets → Light" section
 * and fresh Playwright screenshots from screenshots/actual/
 *
 * Usage: node scripts/create-parity-board.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FOXY_SCRIPT = '/Users/kari.basavaraj.k.m/Documents/code/foxy-design-system-master/scripts/foxy-tool-call.mjs';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'actual');

function callFoxyTool(tool, args) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      JOIN_CHANNEL: 'default',
      TOOL: tool,
      ARGS: JSON.stringify(args),
    };
    const child = spawn('node', [FOXY_SCRIPT], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      const allOutput = stdout + stderr;
      const resultMatch = allOutput.match(/RESULT\s+({.*})/);
      if (resultMatch) {
        try {
          const parsed = JSON.parse(resultMatch[1]);
          const text = parsed.content?.[0]?.text;
          if (text) {
            const inner = JSON.parse(text);
            resolve(inner);
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve({ raw: resultMatch[1] });
        }
      } else {
        reject(new Error(`No RESULT found. Code: ${code}\n${allOutput.slice(-500)}`));
      }
    });
  });
}

/** Read PNG width/height from header. Screenshots are 2x retina, so divide by 2 for logical px. */
function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width: Math.round(width / 2), height: Math.round(height / 2) };
}

// The 12 widgets: name, figmaId from "Ecommerce Widgets → Light" section (id: 3036:15728)
const widgets = [
  { name: 'product-card',       figmaId: '3036:15731' },
  { name: 'product-grid',       figmaId: '3036:15754' },
  { name: 'product-detail',     figmaId: '3037:2792'  },
  { name: 'cart-view',          figmaId: '3036:16107' },
  { name: 'cart-summary',       figmaId: '3036:16151' },
  { name: 'wishlist',           figmaId: '3037:1653'  },
  { name: 'search-bar',         figmaId: '3036:16178' },
  { name: 'category-filter',    figmaId: '3036:16215' },
  { name: 'checkout-form',      figmaId: '3036:16247' },
  { name: 'order-confirmation', figmaId: '3037:1600'  },
  { name: 'price-tag',          figmaId: '3036:16294' },
  { name: 'review-rating',      figmaId: '3036:16309' },
];

// Enrich with screenshot dimensions
for (const w of widgets) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${w.name}.png`);
  if (fs.existsSync(screenshotPath)) {
    const dims = getPngDimensions(screenshotPath);
    w.codeW = dims.width;
    w.codeH = dims.height;
  } else {
    console.warn(`Warning: Screenshot not found: ${screenshotPath}`);
    w.codeW = 400;
    w.codeH = 400;
  }
}

async function main() {
  console.log('Creating fresh parity board in Figma...\n');

  const figmaCode = `
const widgets = ${JSON.stringify(widgets)};

await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

const section = figma.createSection();
section.name = 'Design vs Code — Parity Board';
section.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];

const allSections = figma.currentPage.children.filter(c => c.type === 'SECTION');
let maxX = 0;
for (const s of allSections) {
  if (s.id !== section.id) {
    maxX = Math.max(maxX, s.x + s.width);
  }
}
section.x = maxX + 200;
section.y = 0;

const results = [];
let yOffset = 80;
let maxRowWidth = 0;

const sectionTitle = figma.createText();
sectionTitle.fontName = { family: 'Inter', style: 'Bold' };
sectionTitle.characters = 'DESIGN vs CODE — SIDE BY SIDE PARITY';
sectionTitle.fontSize = 28;
sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
sectionTitle.x = 48;
sectionTitle.y = 24;
section.appendChild(sectionTitle);

for (const w of widgets) {
  const source = await figma.getNodeByIdAsync(w.figmaId);
  if (!source) { continue; }

  const srcW = Math.round(source.width);
  const srcH = Math.round(source.height);
  const codeW = w.codeW;
  const codeH = w.codeH;

  // ROW CONTAINER
  const row = figma.createFrame();
  row.name = w.name;
  row.layoutMode = 'VERTICAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 20;
  row.paddingLeft = 32;
  row.paddingRight = 32;
  row.paddingTop = 24;
  row.paddingBottom = 32;
  row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  row.cornerRadius = 16;
  row.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
  row.strokeWeight = 1;
  row.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 2 }, radius: 8, visible: true, blendMode: 'NORMAL', spread: 0 }];

  // Title Bar
  const titleRow = figma.createFrame();
  titleRow.name = 'Title Bar';
  titleRow.layoutMode = 'HORIZONTAL';
  titleRow.primaryAxisSizingMode = 'AUTO';
  titleRow.counterAxisSizingMode = 'AUTO';
  titleRow.itemSpacing = 16;
  titleRow.fills = [];
  titleRow.counterAxisAlignItems = 'CENTER';

  const widgetDisplayName = w.name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  
  const title = figma.createText();
  title.fontName = { family: 'Inter', style: 'Bold' };
  title.characters = widgetDisplayName;
  title.fontSize = 20;
  title.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
  titleRow.appendChild(title);

  const dimText = figma.createText();
  dimText.fontName = { family: 'Inter', style: 'Regular' };
  dimText.characters = 'Figma ' + srcW + ' x ' + srcH + '  |  Code ' + codeW + ' x ' + codeH;
  dimText.fontSize = 12;
  dimText.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
  titleRow.appendChild(dimText);

  row.appendChild(titleRow);

  // Side-by-side container
  const sideBySide = figma.createFrame();
  sideBySide.name = 'Comparison';
  sideBySide.layoutMode = 'HORIZONTAL';
  sideBySide.primaryAxisSizingMode = 'AUTO';
  sideBySide.counterAxisSizingMode = 'AUTO';
  sideBySide.primaryAxisAlignItems = 'MIN';
  sideBySide.counterAxisAlignItems = 'MIN';
  sideBySide.itemSpacing = 48;
  sideBySide.fills = [];

  // FIGMA COLUMN
  const figmaCol = figma.createFrame();
  figmaCol.name = 'Figma Design';
  figmaCol.layoutMode = 'VERTICAL';
  figmaCol.primaryAxisSizingMode = 'AUTO';
  figmaCol.counterAxisSizingMode = 'AUTO';
  figmaCol.itemSpacing = 12;
  figmaCol.fills = [];

  const figmaLabel = figma.createText();
  figmaLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  figmaLabel.characters = 'FIGMA DESIGN';
  figmaLabel.fontSize = 11;
  figmaLabel.letterSpacing = { value: 8, unit: 'PERCENT' };
  figmaLabel.fills = [{ type: 'SOLID', color: { r: 0.56, g: 0.28, b: 0.96 } }];
  figmaCol.appendChild(figmaLabel);

  const clone = source.clone();
  clone.name = 'Figma / ' + w.name;
  figmaCol.appendChild(clone);
  sideBySide.appendChild(figmaCol);

  // CODE COLUMN
  const codeCol = figma.createFrame();
  codeCol.name = 'Code Render';
  codeCol.layoutMode = 'VERTICAL';
  codeCol.primaryAxisSizingMode = 'AUTO';
  codeCol.counterAxisSizingMode = 'AUTO';
  codeCol.itemSpacing = 12;
  codeCol.fills = [];

  const codeLabel = figma.createText();
  codeLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  codeLabel.characters = 'CODE RENDER (Playwright)';
  codeLabel.fontSize = 11;
  codeLabel.letterSpacing = { value: 8, unit: 'PERCENT' };
  codeLabel.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.6, b: 0.42 } }];
  codeCol.appendChild(codeLabel);

  const codePlaceholder = figma.createFrame();
  codePlaceholder.name = 'screenshot-' + w.name;
  codePlaceholder.resize(codeW, codeH);
  codePlaceholder.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
  codePlaceholder.cornerRadius = 4;
  codePlaceholder.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
  codePlaceholder.strokeWeight = 1;
  codePlaceholder.strokeAlign = 'INSIDE';
  codePlaceholder.clipsContent = false;

  const placeholderText = figma.createText();
  placeholderText.fontName = { family: 'Inter', style: 'Medium' };
  placeholderText.characters = w.name + '.png';
  placeholderText.fontSize = 12;
  placeholderText.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.7 } }];
  placeholderText.x = 16;
  placeholderText.y = Math.round(codeH / 2) - 8;
  codePlaceholder.appendChild(placeholderText);

  codeCol.appendChild(codePlaceholder);
  sideBySide.appendChild(codeCol);

  row.appendChild(sideBySide);

  row.x = 48;
  row.y = yOffset;
  section.appendChild(row);

  yOffset += Math.round(row.height) + 48;
  const rowW = Math.round(row.width);
  if (rowW > maxRowWidth) maxRowWidth = rowW;

  results.push({
    name: w.name,
    rowId: row.id,
    codeFrameId: codePlaceholder.id,
    figmaW: srcW,
    figmaH: srcH,
    codeW,
    codeH
  });
}

section.resizeWithoutConstraints(maxRowWidth + 140, yOffset + 60);
figma.viewport.scrollAndZoomIntoView([section]);

return JSON.stringify({ sectionId: section.id, rows: results });
`;

  console.log('Building section with 12 parity rows...');
  const result = await callFoxyTool('execute_figma_code', { code: figmaCode });
  
  if (!result.success) {
    console.error('Failed:', JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  const data = JSON.parse(result.data);
  console.log(`Section created: ${data.sectionId} (${data.rows.length} rows)\n`);

  // Embed screenshots
  console.log('Embedding fresh screenshots...\n');

  for (const row of data.rows) {
    const imagePath = path.join(SCREENSHOT_DIR, row.name + '.png');
    process.stdout.write(`  ${row.name.padEnd(22)}`);
    
    const embedResult = await callFoxyTool('embed_image_in_node', {
      nodeId: row.codeFrameId,
      imagePath: imagePath,
      removePlaceholderText: true
    });
    
    if (embedResult.success) {
      console.log(`OK (${row.codeW}x${row.codeH})`);
    } else {
      console.log(`FAILED: ${embedResult.error?.message || JSON.stringify(embedResult.error)}`);
    }
  }

  console.log('\nDone! Section: ' + data.sectionId);
}

main().catch(err => { console.error(err); process.exit(1); });
