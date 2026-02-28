#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const sourceDir = resolve(repoRoot, 'mcp-server/tokens');
const targetDir = resolve(repoRoot, 'web-client/tokens');
const tokenFiles = ['figma-tokens-light.css', 'figma-tokens-dark.css'];

const mode = process.argv[2] ?? 'sync';
if (!['sync', 'check'].includes(mode)) {
  console.error('Usage: node scripts/sync-tokens.mjs [sync|check]');
  process.exit(1);
}

if (!existsSync(sourceDir)) {
  console.error(`Missing source token directory: ${sourceDir}`);
  process.exit(1);
}

if (!existsSync(targetDir)) {
  if (mode === 'check') {
    console.error(`Missing target token directory: ${targetDir}`);
    process.exit(1);
  }
  mkdirSync(targetDir, { recursive: true });
}

let hasDrift = false;

for (const file of tokenFiles) {
  const sourcePath = resolve(sourceDir, file);
  const targetPath = resolve(targetDir, file);

  if (!existsSync(sourcePath)) {
    console.error(`Missing source token file: ${sourcePath}`);
    process.exit(1);
  }

  if (mode === 'sync') {
    copyFileSync(sourcePath, targetPath);
    console.log(`synced ${file}`);
    continue;
  }

  if (!existsSync(targetPath)) {
    console.error(`drift: missing ${targetPath}`);
    hasDrift = true;
    continue;
  }

  const source = readFileSync(sourcePath, 'utf8');
  const target = readFileSync(targetPath, 'utf8');
  if (source !== target) {
    console.error(`drift: ${file} differs from mcp-server/tokens`);
    hasDrift = true;
  } else {
    console.log(`ok ${file}`);
  }
}

if (mode === 'check' && hasDrift) {
  console.error('Token drift detected. Run: npm run tokens:sync');
  process.exit(1);
}
