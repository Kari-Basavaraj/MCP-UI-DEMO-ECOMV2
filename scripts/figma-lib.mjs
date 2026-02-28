#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, '..');

export const PATHS = {
  syncConfig: resolve(REPO_ROOT, 'figma/sync.config.json'),
  figmaConfig: resolve(REPO_ROOT, 'figma/figma.config.json'),
  mappingSource: resolve(REPO_ROOT, 'figma/code-connect/mappings.source.json'),
  mappingGenerated: resolve(REPO_ROOT, 'figma/code-connect/mappings.generated.json'),
  requiredComponents: resolve(REPO_ROOT, 'figma/code-connect/required-components.json'),
  tokenNameMap: resolve(REPO_ROOT, 'tokens/figma/token-name-map.json'),
  variablesRaw: resolve(REPO_ROOT, 'tokens/figma/variables.raw.json'),
  variablesNormalized: resolve(REPO_ROOT, 'tokens/figma/variables.normalized.json'),
  variableIds: resolve(REPO_ROOT, 'tokens/figma/.variable-ids.json'),
  lightCss: resolve(REPO_ROOT, 'mcp-server/tokens/figma-tokens-light.css'),
  darkCss: resolve(REPO_ROOT, 'mcp-server/tokens/figma-tokens-dark.css'),
  webLightCss: resolve(REPO_ROOT, 'web-client/tokens/figma-tokens-light.css'),
  webDarkCss: resolve(REPO_ROOT, 'web-client/tokens/figma-tokens-dark.css'),
  verificationJson: resolve(REPO_ROOT, 'docs/code reports/figma-sync-verification.json'),
  verificationMd: resolve(REPO_ROOT, 'docs/code reports/figma-sync-verification.md'),
  probeJson: resolve(REPO_ROOT, 'docs/code reports/figma-capability-probe.json'),
  probeMd: resolve(REPO_ROOT, 'docs/code reports/figma-capability-probe.md'),
  rolloutLog: resolve(REPO_ROOT, 'docs/code reports/figma-cicd-rollout-log.md'),
};

export function nowIso() {
  return new Date().toISOString();
}

export function readJson(path, fallback = null) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function writeText(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, value, 'utf8');
}

export function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function loadSyncConfig() {
  const config = readJson(PATHS.syncConfig, {});
  return {
    primaryFileKey: config?.primaryFileKey ?? '${FIGMA_FILE_KEY}',
    region: config?.region ?? 'us-east-1',
    writeMode: config?.writeMode ?? 'office-only',
    codeConnectMode: config?.codeConnectMode ?? 'verify-only',
    routes: {
      pull: config?.routes?.pull ?? 'ci',
      push: config?.routes?.push ?? 'office',
      publish: config?.routes?.publish ?? 'office',
    },
    canary: {
      enabled: Boolean(config?.canary?.enabled),
      collectionNames: Array.isArray(config?.canary?.collectionNames) ? config.canary.collectionNames : [],
      maxVariables: Number.isFinite(config?.canary?.maxVariables) ? config.canary.maxVariables : 25,
    },
    requiredComponentsPath: config?.requiredComponentsPath ?? 'figma/code-connect/required-components.json',
    mappingSourcePath: config?.mappingSourcePath ?? 'figma/code-connect/mappings.source.json',
  };
}

export function resolveFileKey(config = loadSyncConfig()) {
  const configured = String(config.primaryFileKey ?? '').trim();
  if (configured && configured !== '${FIGMA_FILE_KEY}') return configured;
  return String(process.env.FIGMA_FILE_KEY ?? '').trim();
}

export function getFigmaToken() {
  return String(process.env.FIGMA_ACCESS_TOKEN ?? '').trim();
}

export function getRegion(config = loadSyncConfig()) {
  return String(process.env.FIGMA_REGION || config.region || 'us-east-1');
}

export async function figmaApi(path, { method = 'GET', body = null, config = loadSyncConfig() } = {}) {
  const token = getFigmaToken();
  if (!token) {
    throw new Error('Missing FIGMA_ACCESS_TOKEN');
  }
  const fileKey = resolveFileKey(config);
  if (!fileKey) {
    throw new Error('Missing FIGMA_FILE_KEY (or figma/sync.config.json primaryFileKey)');
  }
  const url = `https://api.figma.com${path.replace('{file_key}', fileKey)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Figma-Region': getRegion(config),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data: parsed,
    url,
  };
}

export function runCommand(cmd, args, { cwd = REPO_ROOT, env = process.env, capture = true } = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: capture ? (result.stdout ?? '').trim() : '',
    stderr: capture ? (result.stderr ?? '').trim() : '',
  };
}

export function isTodo(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return !text || text === 'todo' || text.includes('todo_') || text.includes('todo-node-id');
}

export function slugifyName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function inferCssVarName(figmaVariableName, nameMap = {}) {
  const mapped = nameMap?.[figmaVariableName];
  if (mapped) return mapped.startsWith('--') ? mapped : `--${mapped}`;
  const slug = slugifyName(figmaVariableName).replace(/\//g, '-');
  return slug.startsWith('sds-') ? `--${slug}` : `--sds-${slug}`;
}

export function componentAliasBlock(light = true) {
  if (light) {
    return [
      '  /* Component aliases preserved for runtime compatibility */',
      '  --sds-comp-card-bg: var(--sds-color-background-default-default);',
      '  --sds-comp-card-border: var(--sds-color-border-default-default);',
      '  --sds-comp-card-radius: var(--sds-size-radius-400);',
      '  --sds-comp-card-padding: var(--sds-size-padding-lg);',
      '  --sds-comp-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.10);',
      '  --sds-comp-card-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.10);',
      '  --sds-comp-button-radius: var(--sds-size-radius-200);',
      '  --sds-comp-button-radius-full: var(--sds-size-radius-full);',
      '  --sds-comp-button-height-sm: var(--sds-size-height-button-sm);',
      '  --sds-comp-button-height-md: var(--sds-size-height-button-md);',
      '  --sds-comp-button-height-lg: var(--sds-size-height-button-lg);',
      '  --sds-comp-input-radius: var(--sds-size-radius-200);',
      '  --sds-comp-input-height: var(--sds-size-height-input);',
      '  --sds-comp-input-bg: var(--sds-color-background-default-default);',
      '  --sds-comp-input-border: var(--sds-color-border-default-default);',
      '  --sds-comp-input-border-focus: var(--sds-color-border-brand-default);',
      '  --sds-comp-badge-radius: var(--sds-size-radius-full);',
      '  --sds-comp-badge-bg: var(--sds-color-background-positive-tertiary);',
      '  --sds-comp-badge-color: var(--sds-color-text-positive-default);',
    ].join('\n');
  }

  return [
    '  /* Dark mode component alias overrides */',
    '  --sds-comp-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.30), 0 1px 2px rgba(0, 0, 0, 0.20);',
    '  --sds-comp-card-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.35), 0 8px 16px rgba(0, 0, 0, 0.30);',
  ].join('\n');
}

export function parseCssVariables(cssText) {
  const map = {};
  const regex = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(cssText)) !== null) {
    map[`--${match[1]}`] = match[2].trim();
  }
  return map;
}

export function loadCssVars(path) {
  if (!existsSync(path)) return {};
  return parseCssVariables(readFileSync(path, 'utf8'));
}

export function rgbaToCss(value) {
  const to255 = (n) => Math.max(0, Math.min(255, Math.round(Number(n) * 255)));
  const r = to255(value.r);
  const g = to255(value.g);
  const b = to255(value.b);
  const a = Number(value.a ?? 1);

  if (a >= 0.999) {
    const hex = (v) => v.toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  const alpha = Number(a.toFixed(2));
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

export function shouldBeUnitless(name) {
  const key = String(name).toLowerCase();
  return key.includes('font-weight') || key.endsWith('-weight') || key.includes('line-height-ratio') || key.includes('opacity');
}

export function formatCssValue({ cssVar, value, resolvedType, figmaName }) {
  if (value == null) return null;
  if (resolvedType === 'COLOR' && typeof value === 'object' && value.r != null && value.g != null && value.b != null) {
    return rgbaToCss(value);
  }
  if (resolvedType === 'BOOLEAN') {
    return value ? 'true' : 'false';
  }
  if (resolvedType === 'STRING') {
    return String(value);
  }
  if (resolvedType === 'FLOAT' || typeof value === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    if (shouldBeUnitless(cssVar) || shouldBeUnitless(figmaName)) {
      return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(4)));
    }
    if (number > -1 && number < 1 && (String(figmaName).includes('opacity') || String(cssVar).includes('opacity'))) {
      return String(Number(number.toFixed(4)));
    }
    return Number.isInteger(number) ? `${number}px` : `${Number(number.toFixed(4))}px`;
  }
  if (typeof value === 'object' && value.r != null && value.g != null && value.b != null) {
    return rgbaToCss(value);
  }
  return String(value);
}

export function appendRolloutLog(entry) {
  const stamp = nowIso();
  const line = `- ${stamp} ${entry}`;
  const existing = existsSync(PATHS.rolloutLog) ? readFileSync(PATHS.rolloutLog, 'utf8').trimEnd() : '# Figma CI/CD Rollout Log\n\n';
  writeText(PATHS.rolloutLog, `${existing}\n${line}\n`);
}

export function toMarkdownTable(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`).join('\n');
  return `${head}\n${sep}${body ? `\n${body}` : ''}`;
}
