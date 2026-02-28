#!/usr/bin/env node
import { resolve } from 'node:path';
import {
  PATHS,
  REPO_ROOT,
  appendRolloutLog,
  figmaApi,
  loadSyncConfig,
  nowIso,
  runCommand,
  writeJson,
  writeText,
} from './figma-lib.mjs';

function selectRoute(result) {
  const readOk = result.variablesRead.ok;
  const parseOk = result.codeConnectParse.ok;
  const publishOk = result.codeConnectPublishProbe.ok;
  const writeOk = result.variablesWriteProbe.ok;

  if (readOk && parseOk && publishOk && writeOk) return 'Route B';
  if (readOk && parseOk && (!publishOk || !writeOk)) return 'Route A';
  return 'Route C';
}

function renderMarkdown(result) {
  return [
    '# Figma Capability Probe',
    '',
    `- Generated: ${result.generatedAt}`,
    `- Selected route: **${result.selectedRoute}**`,
    '',
    '| Probe | Status | Details |',
    '| --- | --- | --- |',
    `| Variables GET | ${result.variablesRead.ok ? 'PASS' : 'FAIL'} | ${result.variablesRead.message} |`,
    `| Code Connect Parse | ${result.codeConnectParse.ok ? 'PASS' : 'FAIL'} | ${result.codeConnectParse.message} |`,
    `| Code Connect Publish Probe | ${result.codeConnectPublishProbe.ok ? 'PASS' : 'FAIL'} | ${result.codeConnectPublishProbe.message} |`,
    `| Variables Write Probe | ${result.variablesWriteProbe.ok ? 'PASS' : 'FAIL'} | ${result.variablesWriteProbe.message} |`,
    '',
    '## Notes',
    '- Route A: CI/local read+verify, office publish/write fallback.',
    '- Route B: full CI route permitted.',
    '- Route C: office/manual fallback until auth/capabilities are fixed.',
    '',
  ].join('\n');
}

async function main() {
  const config = loadSyncConfig();
  const configPath = resolve(REPO_ROOT, 'figma/figma.config.json');

  const result = {
    generatedAt: nowIso(),
    config,
    variablesRead: { ok: false, message: '' },
    codeConnectParse: { ok: false, message: '' },
    codeConnectPublishProbe: { ok: false, message: '' },
    variablesWriteProbe: { ok: false, message: '' },
    selectedRoute: 'Route C',
  };

  try {
    const readProbe = await figmaApi('/v1/files/{file_key}/variables/local', { method: 'GET', config });
    result.variablesRead.ok = readProbe.ok;
    result.variablesRead.message = `${readProbe.status} ${readProbe.statusText}`;
  } catch (error) {
    result.variablesRead.message = error instanceof Error ? error.message : String(error);
  }

  const parseProbe = runCommand('npx', ['-y', '@figma/code-connect', 'connect', 'parse', '--config', configPath]);
  result.codeConnectParse.ok = parseProbe.ok;
  result.codeConnectParse.message = parseProbe.ok ? 'CLI parse succeeded' : parseProbe.stderr || parseProbe.stdout || 'parse failed';

  const publishProbe = runCommand('npx', ['-y', '@figma/code-connect', 'connect', 'publish', '--help']);
  result.codeConnectPublishProbe.ok = publishProbe.ok;
  result.codeConnectPublishProbe.message = publishProbe.ok ? 'publish command available' : publishProbe.stderr || publishProbe.stdout || 'publish command unavailable';

  try {
    const writeProbe = await figmaApi('/v1/files/{file_key}/variables', {
      method: 'POST',
      body: { variableModeValues: [] },
      config,
    });
    result.variablesWriteProbe.ok = writeProbe.ok;
    result.variablesWriteProbe.message = `${writeProbe.status} ${writeProbe.statusText}`;
  } catch (error) {
    result.variablesWriteProbe.message = error instanceof Error ? error.message : String(error);
  }

  result.selectedRoute = selectRoute(result);
  writeJson(PATHS.probeJson, result);
  writeText(PATHS.probeMd, renderMarkdown(result));

  appendRolloutLog(`figma:probe route=${result.selectedRoute} read=${result.variablesRead.ok} parse=${result.codeConnectParse.ok} publishProbe=${result.codeConnectPublishProbe.ok} writeProbe=${result.variablesWriteProbe.ok}`);

  console.log(JSON.stringify({
    ok: true,
    selectedRoute: result.selectedRoute,
    output: [PATHS.probeJson, PATHS.probeMd],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
