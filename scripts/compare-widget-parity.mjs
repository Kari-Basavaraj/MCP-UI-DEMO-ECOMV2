import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REF_DIR = path.join(ROOT, 'screenshots');
const ACT_DIR = path.join(ROOT, 'screenshots', 'actual');
const DIFF_DIR = path.join(ROOT, 'screenshots', 'diff');

if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR, { recursive: true });

const widgets = [
  'product-card','product-grid','cart-view','cart-summary','search-bar','category-filter',
  'checkout-form','price-tag','review-rating','order-confirmation','wishlist','product-detail'
];

const report = [];

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

for (const widget of widgets) {
  const refPath = path.join(REF_DIR, `${widget}.png`);
  const actPath = path.join(ACT_DIR, `${widget}.png`);
  if (!fs.existsSync(refPath) || !fs.existsSync(actPath)) {
    report.push({ widget, status: 'missing', refExists: fs.existsSync(refPath), actExists: fs.existsSync(actPath) });
    continue;
  }

  const ref = readPng(refPath);
  const act = readPng(actPath);

  const width = Math.min(ref.width, act.width);
  const height = Math.min(ref.height, act.height);

  const refCrop = new PNG({ width, height });
  const actCrop = new PNG({ width, height });
  PNG.bitblt(ref, refCrop, 0, 0, width, height, 0, 0);
  PNG.bitblt(act, actCrop, 0, 0, width, height, 0, 0);

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(refCrop.data, actCrop.data, diff.data, width, height, {
    threshold: 0.12,
    includeAA: true,
  });

  const total = width * height;
  const diffRatio = total > 0 ? diffPixels / total : 0;

  const diffPath = path.join(DIFF_DIR, `${widget}.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  report.push({
    widget,
    status: 'ok',
    ref: { width: ref.width, height: ref.height },
    act: { width: act.width, height: act.height },
    compared: { width, height },
    diffPixels,
    diffRatio,
    parityScore: Number((100 - diffRatio * 100).toFixed(2)),
    diffImage: path.relative(ROOT, diffPath),
  });
}

report.sort((a, b) => {
  if (a.status !== 'ok') return 1;
  if (b.status !== 'ok') return -1;
  return a.parityScore - b.parityScore;
});

const outJson = path.join(ROOT, 'docs', 'widget-parity-report.json');
fs.writeFileSync(outJson, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));

const outMd = path.join(ROOT, 'docs', 'widget-parity-report.md');
const lines = [
  '# Widget Parity Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Widget | Parity Score | Diff Ratio | Ref Size | Code Size | Compared | Diff Image |',
  '|---|---:|---:|---|---|---|---|',
];

for (const r of report) {
  if (r.status !== 'ok') {
    lines.push(`| ${r.widget} | N/A | N/A | - | - | - | missing |`);
    continue;
  }
  lines.push(`| ${r.widget} | ${r.parityScore}% | ${(r.diffRatio * 100).toFixed(2)}% | ${r.ref.width}x${r.ref.height} | ${r.act.width}x${r.act.height} | ${r.compared.width}x${r.compared.height} | ${r.diffImage} |`);
}

fs.writeFileSync(outMd, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, outJson)} and ${path.relative(ROOT, outMd)}`);
