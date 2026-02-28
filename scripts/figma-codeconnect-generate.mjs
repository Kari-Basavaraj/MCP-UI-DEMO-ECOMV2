#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PATHS,
  REPO_ROOT,
  appendRolloutLog,
  loadSyncConfig,
  readJson,
  resolveFileKey,
  writeJson,
} from './figma-lib.mjs';

async function main() {
  const config = loadSyncConfig();
  const sourcePath = resolve(REPO_ROOT, config.mappingSourcePath);
  const requiredPath = resolve(REPO_ROOT, config.requiredComponentsPath);

  const source = readJson(sourcePath, null);
  const required = readJson(requiredPath, null);

  if (!source?.mappings || !Array.isArray(source.mappings)) {
    throw new Error(`Invalid mappings source: ${sourcePath}`);
  }
  if (!required?.components || !Array.isArray(required.components)) {
    throw new Error(`Invalid required components: ${requiredPath}`);
  }

  const fileKey = resolveFileKey(config) || source.fileKey || '${FIGMA_FILE_KEY}';
  const sourceById = new Map(source.mappings.map((item) => [item.id, item]));

  const generated = [];
  const missing = [];

  for (const req of required.components) {
    const src = sourceById.get(req.id);
    if (!src) {
      missing.push({ id: req.id, componentName: req.componentName, reason: 'missing-source-entry' });
      continue;
    }

    const resolvedSource = resolve(src.source || '');
    generated.push({
      id: req.id,
      componentName: src.componentName || req.componentName,
      label: src.label || 'React',
      fileKey,
      nodeId: src.nodeId || '',
      source: src.source,
      sourceExists: existsSync(resolvedSource),
      required: req.required !== false,
      notes: src.notes || '',
    });
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    fileKey,
    requiredCount: required.components.length,
    generatedCount: generated.length,
    missing,
    mappings: generated,
  };

  writeJson(PATHS.mappingGenerated, output);
  appendRolloutLog(`figma:codeconnect:generate mappings=${generated.length} missing=${missing.length}`);

  console.log(JSON.stringify({
    ok: missing.length === 0,
    generatedPath: PATHS.mappingGenerated,
    requiredCount: required.components.length,
    generatedCount: generated.length,
    missing,
  }, null, 2));

  if (missing.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
