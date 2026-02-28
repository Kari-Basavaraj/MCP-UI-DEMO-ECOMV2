#!/usr/bin/env node
import { resolve } from 'node:path';
import {
  PATHS,
  REPO_ROOT,
  appendRolloutLog,
  isTodo,
  loadSyncConfig,
  nowIso,
  readJson,
  runCommand,
  writeJson,
} from './figma-lib.mjs';

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    apply: flags.has('--apply'),
    dryRun: !flags.has('--apply') || flags.has('--dry-run'),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const config = loadSyncConfig();
  const mapping = readJson(PATHS.mappingGenerated, null);

  if (!mapping?.mappings || !Array.isArray(mapping.mappings)) {
    throw new Error('Missing generated mappings. Run npm run figma:codeconnect:generate first.');
  }

  if (config.codeConnectMode !== 'publish-enabled' && args.apply && !args.dryRun) {
    throw new Error(`codeConnectMode=${config.codeConnectMode}. Enable publish mode in figma/sync.config.json to apply publish.`);
  }

  if (args.apply && config.routes.publish === 'office' && String(process.env.FIGMA_WRITE_CONTEXT || '').toLowerCase() !== 'office') {
    throw new Error('routes.publish=office. Set FIGMA_WRITE_CONTEXT=office for publish apply.');
  }

  const unresolved = mapping.mappings.filter((item) => isTodo(item.nodeId));
  if (args.apply && unresolved.length > 0) {
    throw new Error(`Cannot publish with unresolved node IDs (${unresolved.length}). Fill figma/code-connect/mappings.source.json and regenerate.`);
  }

  const configPath = resolve(REPO_ROOT, 'figma/figma.config.json');

  const verifyCli = runCommand('npx', ['-y', '@figma/code-connect', 'connect', 'parse', '--config', configPath]);
  const report = {
    generatedAt: nowIso(),
    dryRun: args.dryRun,
    applyRequested: args.apply,
    route: config.routes.publish,
    codeConnectMode: config.codeConnectMode,
    parseCheck: verifyCli,
    publish: null,
    unresolvedNodeIds: unresolved.map((item) => ({ id: item.id, componentName: item.componentName, nodeId: item.nodeId })),
  };

  if (!verifyCli.ok) {
    throw new Error(`Code Connect parse failed: ${verifyCli.stderr || verifyCli.stdout || 'unknown error'}`);
  }

  if (args.apply && !args.dryRun) {
    const publish = runCommand('npx', ['-y', '@figma/code-connect', 'connect', 'publish', '--config', configPath], { capture: true });
    report.publish = publish;

    if (!publish.ok) {
      throw new Error(`Code Connect publish failed: ${publish.stderr || publish.stdout || 'unknown error'}`);
    }
  }

  const reportPath = resolve(REPO_ROOT, `docs/code reports/figma-codeconnect-publish-${nowIso().replace(/[:.]/g, '-')}.json`);
  writeJson(reportPath, report);

  appendRolloutLog(`figma:codeconnect:publish ${args.dryRun ? 'dry-run' : 'apply'} unresolved=${unresolved.length}`);

  console.log(JSON.stringify({
    ok: true,
    dryRun: args.dryRun,
    reportPath,
    unresolved: unresolved.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
