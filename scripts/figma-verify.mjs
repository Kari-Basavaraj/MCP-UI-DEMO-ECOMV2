#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import {
  PATHS,
  appendRolloutLog,
  loadCssVars,
  nowIso,
  readJson,
  runCommand,
  toMarkdownTable,
  writeJson,
  writeText,
} from './figma-lib.mjs';

function findFontWeightUnitViolations(cssText, file) {
  const lines = cssText.split('\n');
  const violations = [];
  lines.forEach((line, index) => {
    const match = line.match(/--[a-z0-9-_]*font-weight[a-z0-9-_]*\s*:\s*([^;]+);/i);
    if (match && /px\s*$/i.test(match[1].trim())) {
      violations.push({ file, line: index + 1, value: match[1].trim() });
    }
  });
  return violations;
}

async function main() {
  const startedAt = nowIso();
  const findings = [];
  const failures = [];

  const requiredFiles = [
    PATHS.lightCss,
    PATHS.darkCss,
    PATHS.mappingSource,
    PATHS.requiredComponents,
    PATHS.tokenNameMap,
  ];

  requiredFiles.forEach((file) => {
    if (!existsSync(file)) {
      failures.push(`missing-file:${file}`);
      findings.push({ type: 'missing-file', file, detail: 'required artifact is missing' });
    }
  });

  const tokenCheck = runCommand('npm', ['run', 'tokens:check']);
  if (!tokenCheck.ok) {
    failures.push('token-drift');
    findings.push({ type: 'token-drift', file: 'mcp-server/tokens + web-client/tokens', detail: tokenCheck.stderr || tokenCheck.stdout || 'tokens:check failed' });
  }

  const mapInfo = readJson(PATHS.tokenNameMap, { requiredTokens: [] });
  const lightVars = loadCssVars(PATHS.lightCss);
  const requiredTokens = Array.isArray(mapInfo.requiredTokens) ? mapInfo.requiredTokens : [];
  const missingRequiredTokens = requiredTokens.filter((token) => !(token in lightVars));

  if (missingRequiredTokens.length > 0) {
    failures.push('missing-required-tokens');
    missingRequiredTokens.forEach((token) => findings.push({ type: 'missing-required-token', file: PATHS.lightCss, detail: token }));
  }

  const lightCss = existsSync(PATHS.lightCss) ? readFileSync(PATHS.lightCss, 'utf8') : '';
  const darkCss = existsSync(PATHS.darkCss) ? readFileSync(PATHS.darkCss, 'utf8') : '';
  const typographyViolations = [
    ...findFontWeightUnitViolations(lightCss, PATHS.lightCss),
    ...findFontWeightUnitViolations(darkCss, PATHS.darkCss),
  ];

  if (typographyViolations.length > 0) {
    failures.push('invalid-font-weight-units');
    typographyViolations.forEach((issue) => findings.push({ type: 'invalid-font-weight-units', file: issue.file, detail: `${issue.value} at line ${issue.line}` }));
  }

  const codeconnectGenerate = runCommand('npm', ['run', 'figma:codeconnect:generate']);
  if (!codeconnectGenerate.ok) {
    failures.push('codeconnect-generate-failed');
    findings.push({ type: 'codeconnect-generate-failed', file: PATHS.mappingSource, detail: codeconnectGenerate.stderr || codeconnectGenerate.stdout || 'generation failed' });
  }

  const codeconnectVerify = runCommand('npm', ['run', 'figma:codeconnect:verify']);
  if (!codeconnectVerify.ok) {
    failures.push('codeconnect-verify-failed');
    findings.push({ type: 'codeconnect-verify-failed', file: PATHS.mappingGenerated, detail: codeconnectVerify.stderr || codeconnectVerify.stdout || 'verify failed' });
  }

  const report = {
    generatedAt: nowIso(),
    startedAt,
    ok: failures.length === 0,
    failures,
    findings,
    checks: {
      tokenCheck,
      codeconnectGenerate,
      codeconnectVerify,
      missingRequiredTokens,
      typographyViolations,
    },
  };

  writeJson(PATHS.verificationJson, report);
  const markdownRows = findings.map((f) => ({ Type: f.type, File: f.file, Detail: f.detail }));
  const md = [
    '# Figma Sync Verification',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Status: ${report.ok ? 'PASS' : 'FAIL'}`,
    `- Failure count: ${report.failures.length}`,
    '',
    '## Findings',
    markdownRows.length === 0 ? 'No findings.' : toMarkdownTable(markdownRows, ['Type', 'File', 'Detail']),
    '',
    '## Checks',
    `- tokens:check: ${tokenCheck.ok ? 'PASS' : 'FAIL'}`,
    `- figma:codeconnect:generate: ${codeconnectGenerate.ok ? 'PASS' : 'FAIL'}`,
    `- figma:codeconnect:verify: ${codeconnectVerify.ok ? 'PASS' : 'FAIL'}`,
    `- Missing required tokens: ${missingRequiredTokens.length}`,
    `- Typography unit violations: ${typographyViolations.length}`,
    '',
  ].join('\n');
  writeText(PATHS.verificationMd, md);

  appendRolloutLog(`figma:verify ${report.ok ? 'pass' : 'fail'} failures=${report.failures.length}`);

  console.log(JSON.stringify({ ok: report.ok, failures: report.failures, output: [PATHS.verificationJson, PATHS.verificationMd] }, null, 2));

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
