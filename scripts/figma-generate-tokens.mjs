#!/usr/bin/env node
import {
  PATHS,
  appendRolloutLog,
  componentAliasBlock,
  loadSyncConfig,
  nowIso,
  readJson,
  writeText,
} from './figma-lib.mjs';

function renderCssBlock(map, { headerComments = [], includeAliases = false } = {}) {
  const lines = [];
  headerComments.forEach((comment) => lines.push(`/* ${comment} */`));
  lines.push(':root {');
  Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, value]) => {
      lines.push(`  ${name}: ${value};`);
    });
  if (includeAliases) {
    lines.push('');
    lines.push(componentAliasBlock(true));
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function renderDarkCss(map, { modeLabel = 'Dark' } = {}) {
  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const body = sorted.map(([name, value]) => `    ${name}: ${value};`).join('\n');
  const explicitDark = sorted.map(([name, value]) => `  ${name}: ${value};`).join('\n');

  return [
    '/* Auto-generated from Figma Variables API — DO NOT EDIT MANUALLY */',
    `/* Mode: ${modeLabel} */`,
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    body,
    '',
    `    ${componentAliasBlock(false).replace(/\n/g, '\n    ')}`,
    '  }',
    '}',
    '',
    '[data-theme="dark"] {',
    explicitDark,
    '',
    `  ${componentAliasBlock(false).replace(/\n/g, '\n  ')}`,
    '}',
    '',
  ].join('\n');
}

async function main() {
  const config = loadSyncConfig();
  const normalized = readJson(PATHS.variablesNormalized, null);

  if (!normalized?.byMode || !normalized?.modeSelection) {
    throw new Error(`Missing or invalid ${PATHS.variablesNormalized}. Run figma:pull:variables first.`);
  }

  const lightModeId = normalized.modeSelection.lightModeId || Object.keys(normalized.byMode)[0];
  const darkModeId = normalized.modeSelection.darkModeId || null;

  if (!lightModeId || !normalized.byMode[lightModeId]) {
    throw new Error('Unable to resolve light mode tokens from normalized variables.');
  }

  const lightCss = renderCssBlock(normalized.byMode[lightModeId], {
    headerComments: [
      'Auto-generated from Figma Variables API — DO NOT EDIT MANUALLY',
      `Mode: ${normalized.modeMeta?.[lightModeId]?.modeName || lightModeId}`,
      `Generated: ${nowIso()}`,
    ],
    includeAliases: true,
  });

  const darkCss = darkModeId && normalized.byMode[darkModeId]
    ? renderDarkCss(normalized.byMode[darkModeId], {
        modeLabel: normalized.modeMeta?.[darkModeId]?.modeName || darkModeId,
      })
    : '/* No dark mode variables found in normalized payload. */\n';

  writeText(PATHS.lightCss, lightCss);
  writeText(PATHS.darkCss, darkCss);

  appendRolloutLog(`figma:generate:tokens ok light=${lightModeId} dark=${darkModeId || 'none'} file=${normalized.fileKey || config.primaryFileKey}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        lightModeId,
        darkModeId,
        output: [PATHS.lightCss, PATHS.darkCss],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
