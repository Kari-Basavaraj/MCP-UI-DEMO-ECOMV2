import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REF_DIR = path.join(ROOT, "screenshots");
const ACT_DIR = path.join(ROOT, "screenshots", "actual");
const DIFF_DIR = path.join(ROOT, "screenshots", "diff");
const OUT_JSON = path.join(ROOT, "docs", "widget-parity-report.json");
const OUT_MD = path.join(ROOT, "docs", "widget-parity-report.md");

const REPORT_SCHEMA_VERSION = "1.1.0";
const THRESHOLDS = {
  critical: 0.30,
  high: 0.20,
  medium: 0.10,
  low: 0.05,
};

const WIDGETS = [
  "product-card",
  "product-grid",
  "cart-view",
  "cart-summary",
  "search-bar",
  "category-filter",
  "checkout-form",
  "price-tag",
  "review-rating",
  "order-confirmation",
  "wishlist",
  "product-detail",
];

if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR, { recursive: true });

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function toSeverity(diffRatio) {
  if (diffRatio >= THRESHOLDS.critical) return "critical";
  if (diffRatio >= THRESHOLDS.high) return "high";
  if (diffRatio >= THRESHOLDS.medium) return "medium";
  if (diffRatio >= THRESHOLDS.low) return "low";
  return "pass";
}

function remediationHint(widget, severity) {
  if (severity === "critical" || severity === "high") {
    return `Inspect ${widget} spacing/typography/layout against reference and patch widget source before rerun.`;
  }
  if (severity === "medium") {
    return `Tighten dimensions and token usage for ${widget}; rerun parity check.`;
  }
  if (severity === "low") {
    return `Review minor visual drift for ${widget}; fix if user-visible.`;
  }
  return "No immediate remediation required.";
}

const widgets = [];

for (const widget of WIDGETS) {
  const refPath = path.join(REF_DIR, `${widget}.png`);
  const actPath = path.join(ACT_DIR, `${widget}.png`);
  const refExists = fs.existsSync(refPath);
  const actExists = fs.existsSync(actPath);

  if (!refExists || !actExists) {
    widgets.push({
      widget,
      status: "missing",
      severity: "critical",
      refExists,
      actExists,
      remediation: `Missing ${!refExists ? "reference" : "actual"} screenshot for ${widget}.`,
    });
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

  const totalPixels = width * height;
  const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0;
  const parityScore = Number((100 - diffRatio * 100).toFixed(2));
  const severity = toSeverity(diffRatio);

  const diffPath = path.join(DIFF_DIR, `${widget}.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  widgets.push({
    widget,
    status: "ok",
    severity,
    parityScore,
    diffRatio,
    diffPixels,
    sizes: {
      ref: { width: ref.width, height: ref.height },
      actual: { width: act.width, height: act.height },
      compared: { width, height },
    },
    artifacts: {
      reference: path.relative(ROOT, refPath),
      actual: path.relative(ROOT, actPath),
      diff: path.relative(ROOT, diffPath),
    },
    remediation: remediationHint(widget, severity),
  });
}

const comparable = widgets.filter((w) => w.status === "ok");
const missing = widgets.filter((w) => w.status === "missing");
const severityCounts = {
  critical: widgets.filter((w) => w.severity === "critical").length,
  high: widgets.filter((w) => w.severity === "high").length,
  medium: widgets.filter((w) => w.severity === "medium").length,
  low: widgets.filter((w) => w.severity === "low").length,
  pass: widgets.filter((w) => w.severity === "pass").length,
};

const sortedByWorst = [...widgets].sort((a, b) => {
  const aRatio = a.diffRatio ?? 1;
  const bRatio = b.diffRatio ?? 1;
  return bRatio - aRatio;
});

const topOffenders = sortedByWorst.slice(0, 5).map((w) => ({
  widget: w.widget,
  status: w.status,
  severity: w.severity,
  parityScore: w.parityScore ?? 0,
  diffRatio: w.diffRatio ?? 1,
}));

const avgParityScore =
  comparable.length === 0
    ? 0
    : Number(
        (
          comparable.reduce((sum, item) => sum + item.parityScore, 0) / comparable.length
        ).toFixed(2)
      );

const report = {
  schemaVersion: REPORT_SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  thresholds: THRESHOLDS,
  summary: {
    totalWidgets: WIDGETS.length,
    comparedWidgets: comparable.length,
    missingWidgets: missing.length,
    avgParityScore,
    severityCounts,
    topOffenders,
  },
  widgets: sortedByWorst,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const lines = [
  "# Widget Parity Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Schema: ${report.schemaVersion}`,
  "",
  "## Summary",
  `- Total widgets: ${report.summary.totalWidgets}`,
  `- Compared widgets: ${report.summary.comparedWidgets}`,
  `- Missing widgets: ${report.summary.missingWidgets}`,
  `- Average parity score: ${report.summary.avgParityScore}%`,
  `- Severity counts: critical=${severityCounts.critical}, high=${severityCounts.high}, medium=${severityCounts.medium}, low=${severityCounts.low}, pass=${severityCounts.pass}`,
  "",
  "## Top Offenders",
  "| Rank | Widget | Status | Severity | Parity Score | Diff Ratio |",
  "|---:|---|---|---|---:|---:|",
];

report.summary.topOffenders.forEach((item, index) => {
  lines.push(
    `| ${index + 1} | ${item.widget} | ${item.status} | ${item.severity} | ${item.parityScore.toFixed(2)}% | ${(item.diffRatio * 100).toFixed(2)}% |`
  );
});

lines.push("");
lines.push("## Widget Details");
lines.push("| Widget | Status | Severity | Parity Score | Diff Ratio | Compared Size | Diff Image |");
lines.push("|---|---|---|---:|---:|---|---|");

for (const item of report.widgets) {
  if (item.status !== "ok") {
    lines.push(`| ${item.widget} | missing | critical | 0.00% | 100.00% | - | - |`);
    continue;
  }
  lines.push(
    `| ${item.widget} | ok | ${item.severity} | ${item.parityScore.toFixed(2)}% | ${(item.diffRatio * 100).toFixed(2)}% | ${item.sizes.compared.width}x${item.sizes.compared.height} | ${item.artifacts.diff} |`
  );
}

lines.push("");
lines.push("## Remediation Queue");
for (const item of report.widgets) {
  lines.push(`- ${item.widget}: ${item.remediation}`);
}

fs.writeFileSync(OUT_MD, lines.join("\n"));

console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_MD)}`);
