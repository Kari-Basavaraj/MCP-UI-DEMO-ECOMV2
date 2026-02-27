/**
 * Generates Figma plugin code for placing browser screenshots into Visual Diff rows.
 * Reads base64 files and outputs the code to stdout for each widget.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Widget name → { frameId, cloneId, width, height (from screenshots) }
const WIDGETS = [
  { name: 'search-bar',          frameId: '3039:11588', removeId: '3039:12486', w: 520, h: 120 },
  { name: 'cart-summary',        frameId: '3039:11517', removeId: '3039:11519', w: 420, h: 100 },
  { name: 'price-tag',           frameId: '3039:11829', removeId: '3039:11831', w: 420, h: 203 },
  { name: 'checkout-form',       frameId: '3039:11755', removeId: '3039:11757', w: 520, h: 900 },
  { name: 'cart-view',           frameId: '3039:11440', removeId: '3039:11442', w: 520, h: 426 },
  { name: 'review-rating',       frameId: '3039:11901', removeId: '3039:11903', w: 520, h: 762 },
  { name: 'order-confirmation',  frameId: '3039:12010', removeId: '3039:12012', w: 540, h: 747 },
  { name: 'product-card',        frameId: '3039:11104', removeId: '3039:11106', w: 420, h: 449 },
  { name: 'wishlist',            frameId: '3039:12133', removeId: '3039:12135', w: 950, h: 438 },
  { name: 'category-filter',     frameId: '3039:11670', removeId: '3039:11672', w: 950, h: 453 },
  { name: 'product-detail',      frameId: '3039:12235', removeId: '3039:12237', w: 860, h: 570 },
  { name: 'product-grid',        frameId: '3039:11241', removeId: '3039:11243', w: 950, h: 855 },
];

const widgetName = process.argv[2];
if (!widgetName) {
  console.error('Usage: node gen-figma-code.mjs <widget-name>');
  console.error('Available:', WIDGETS.map(w => w.name).join(', '));
  process.exit(1);
}

const widget = WIDGETS.find(w => w.name === widgetName);
if (!widget) {
  console.error(`Widget "${widgetName}" not found`);
  process.exit(1);
}

const b64Path = path.join(__dirname, 'screenshots', `${widget.name}.b64`);
const b64Data = fs.readFileSync(b64Path, 'utf-8').replace(/\s+/g, '');

// Generate the Figma plugin code
const code = `
const b64 = "${b64Data}";
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < CHARS.length; i++) lookup[CHARS.charCodeAt(i)] = i;
function b64ToBytes(str) {
  let len = str.length;
  if (str[len - 1] === '=') len--;
  if (str[len - 1] === '=') len--;
  const bytes = new Uint8Array(Math.floor(len * 3 / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[str.charCodeAt(i)];
    const b = lookup[str.charCodeAt(i + 1)];
    const c = lookup[str.charCodeAt(i + 2)];
    const d = lookup[str.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (i + 2 < len) bytes[p++] = ((b & 0xf) << 4) | (c >> 2);
    if (i + 3 < len) bytes[p++] = ((c & 0x3) << 6) | d;
  }
  return bytes.slice(0, p);
}
const pngBytes = b64ToBytes(b64);
const image = figma.createImage(pngBytes);
const hash = image.hash;
const frame = await figma.getNodeByIdAsync('${widget.frameId}');
const old = await figma.getNodeByIdAsync('${widget.removeId}');
if (old) old.remove();
const rect = figma.createRectangle();
rect.name = '${widget.name} (Browser Render)';
rect.resize(${widget.w}, ${widget.h});
rect.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
frame.appendChild(rect);
frame.resize(${widget.w} + 40, ${widget.h} + 60);
return '${widget.name} placed! Hash: ' + hash;
`;

console.log(code);
