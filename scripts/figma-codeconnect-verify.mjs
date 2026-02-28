#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS, REPO_ROOT, appendRolloutLog, isTodo, loadSyncConfig, readJson } from './figma-lib.mjs';

function parseArgs(argv) {
  return {
    strict: argv.includes('--strict'),
  };
}

async function main() {
  const { strict } = parseArgs(process.argv.slice(2));
  const config = loadSyncConfig();
  const generated = readJson(PATHS.mappingGenerated, null);
  const required = readJson(resolve(REPO_ROOT, config.requiredComponentsPath), null);

  if (!generated?.mappings || !Array.isArray(generated.mappings)) {
    throw new Error(`Missing generated mappings. Run npm run figma:codeconnect:generate first.`);
  }

  const requiredComponents = Array.isArray(required?.components) ? required.components.filter((c) => c.required !== false) : [];
  const mapById = new Map(generated.mappings.map((item) => [item.id, item]));

  const findings = {
    missingRequired: [],
    missingSourceFiles: [],
    placeholderNodeIds: [],
  };

  for (const req of requiredComponents) {
    const mapping = mapById.get(req.id);
    if (!mapping) {
      findings.missingRequired.push({ id: req.id, componentName: req.componentName });
      continue;
    }

    const absSource = resolve(REPO_ROOT, mapping.source || '');
    if (!existsSync(absSource)) {
      findings.missingSourceFiles.push({ id: req.id, componentName: req.componentName, source: mapping.source });
    }

    if (isTodo(mapping.nodeId)) {
      findings.placeholderNodeIds.push({ id: req.id, componentName: req.componentName, nodeId: mapping.nodeId || '' });
    }
  }

  const errors = [];
  if (findings.missingRequired.length > 0) errors.push(`missingRequired=${findings.missingRequired.length}`);
  if (findings.missingSourceFiles.length > 0) errors.push(`missingSourceFiles=${findings.missingSourceFiles.length}`);
  if (strict && findings.placeholderNodeIds.length > 0) errors.push(`placeholderNodeIds=${findings.placeholderNodeIds.length}`);

  appendRolloutLog(`figma:codeconnect:verify strict=${strict} missingRequired=${findings.missingRequired.length} missingSourceFiles=${findings.missingSourceFiles.length} placeholderNodeIds=${findings.placeholderNodeIds.length}`);

  console.log(JSON.stringify({
    ok: errors.length === 0,
    strict,
    summary: {
      mappings: generated.mappings.length,
      required: requiredComponents.length,
      missingRequired: findings.missingRequired.length,
      missingSourceFiles: findings.missingSourceFiles.length,
      placeholderNodeIds: findings.placeholderNodeIds.length,
    },
    findings,
  }, null, 2));

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
