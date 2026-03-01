#!/usr/bin/env node
import { basename, resolve } from 'node:path';
import {
  PATHS,
  appendRolloutLog,
  figmaApi,
  isTodo,
  loadCssVars,
  loadSyncConfig,
  nowIso,
  readJson,
  writeJson,
} from './figma-lib.mjs';

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    apply: flags.has('--apply'),
    dryRun: !flags.has('--apply') || flags.has('--dry-run'),
  };
}

function parseCssValueToFigma(value) {
  const text = String(value ?? '').trim();
  const hex = text.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const raw = hex[1];
    const toDec = (part) => Number.parseInt(part, 16) / 255;
    if (raw.length === 6) {
      return {
        r: Number(toDec(raw.slice(0, 2)).toFixed(6)),
        g: Number(toDec(raw.slice(2, 4)).toFixed(6)),
        b: Number(toDec(raw.slice(4, 6)).toFixed(6)),
        a: 1,
      };
    }
    return {
      r: Number(toDec(raw.slice(0, 2)).toFixed(6)),
      g: Number(toDec(raw.slice(2, 4)).toFixed(6)),
      b: Number(toDec(raw.slice(4, 6)).toFixed(6)),
      a: Number(toDec(raw.slice(6, 8)).toFixed(6)),
    };
  }

  const rgba = text.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((part) => part.trim());
    if (parts.length >= 3) {
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      const a = parts.length >= 4 ? Number(parts[3]) : 1;
      if ([r, g, b, a].every((num) => Number.isFinite(num))) {
        return {
          r: Number((r / 255).toFixed(6)),
          g: Number((g / 255).toFixed(6)),
          b: Number((b / 255).toFixed(6)),
          a: Number(a.toFixed(6)),
        };
      }
    }
  }

  if (text === 'true' || text === 'false') return text === 'true';

  const number = Number(text.replace(/px$/, ''));
  if (!Number.isNaN(number) && Number.isFinite(number)) {
    return number;
  }

  return text;
}

function chooseModeId(modeMap, fallback) {
  if (!modeMap || typeof modeMap !== 'object') return null;
  const entries = Object.entries(modeMap);
  if (fallback) {
    const target = entries.find(([name]) => name.toLowerCase() === fallback.toLowerCase());
    if (target) return target[1];
  }
  return entries[0]?.[1] || null;
}

function buildVariableModeValues({ ids, normalized, lightVars, darkVars }) {
  const updates = [];
  const skipped = [];

  const lightModeName = normalized?.modeSelection?.lightModeName || 'Light';
  const darkModeName = normalized?.modeSelection?.darkModeName || 'Dark';

  const allNames = new Set([...Object.keys(lightVars), ...Object.keys(darkVars)]);
  for (const cssVar of allNames) {
    const meta = ids.variables?.[cssVar];
    if (!meta?.variableId || isTodo(meta.variableId)) {
      skipped.push({ cssVar, reason: 'missing-variable-id' });
      continue;
    }

    const lightModeId = chooseModeId(meta.modes, lightModeName);
    const darkModeId = chooseModeId(meta.modes, darkModeName);

    if (lightVars[cssVar] != null) {
      if (!lightModeId) {
        skipped.push({ cssVar, reason: 'missing-light-mode-id' });
      } else {
        updates.push({
          collectionId: meta.collectionId,
          variableId: meta.variableId,
          modeId: lightModeId,
          value: parseCssValueToFigma(lightVars[cssVar]),
          cssVar,
          collectionName: meta.collectionName,
        });
      }
    }

    if (darkVars[cssVar] != null && darkModeId) {
      updates.push({
        collectionId: meta.collectionId,
        variableId: meta.variableId,
        modeId: darkModeId,
        value: parseCssValueToFigma(darkVars[cssVar]),
        cssVar,
        collectionName: meta.collectionName,
      });
    }
  }

  return { updates, skipped };
}

async function main() {
  const args = parseArgs(process.argv);
  const config = loadSyncConfig();
  const ids = readJson(PATHS.variableIds, null);
  const normalized = readJson(PATHS.variablesNormalized, null);

  if (!ids?.variables || !normalized?.modeSelection) {
    throw new Error(`Missing ${PATHS.variableIds} or ${PATHS.variablesNormalized}. Run figma:pull:variables first.`);
  }

  if (args.apply && config.writeMode === 'disabled') {
    throw new Error('writeMode=disabled. Push apply is not allowed.');
  }

  if (args.apply && config.writeMode === 'office-only' && String(process.env.FIGMA_WRITE_CONTEXT || '').toLowerCase() !== 'office') {
    throw new Error('writeMode=office-only. Set FIGMA_WRITE_CONTEXT=office to apply changes from office context.');
  }

  const lightVars = loadCssVars(PATHS.lightCss);
  const darkVars = loadCssVars(PATHS.darkCss);

  const { updates, skipped } = buildVariableModeValues({ ids, normalized, lightVars, darkVars });

  let filteredUpdates = updates;

  // Filter out remote/library variables (they have '/' in their variableId)
  filteredUpdates = filteredUpdates.filter((u) => !String(u.variableId).includes('/'));

  if (config.canary.enabled && config.canary.collectionNames.length > 0) {
    const allowed = new Set(config.canary.collectionNames.map((name) => name.toLowerCase()));
    filteredUpdates = updates.filter((update) => allowed.has(String(update.collectionName || '').toLowerCase()));
  }

  if (config.canary.enabled && filteredUpdates.length > config.canary.maxVariables) {
    throw new Error(`Canary guard triggered: ${filteredUpdates.length} updates exceed maxVariables=${config.canary.maxVariables}`);
  }

  const report = {
    generatedAt: nowIso(),
    dryRun: args.dryRun,
    applyRequested: args.apply,
    writeMode: config.writeMode,
    canary: config.canary,
    stats: {
      discoveredUpdates: updates.length,
      filteredUpdates: filteredUpdates.length,
      skipped: skipped.length,
    },
    skipped,
    sampleUpdates: filteredUpdates.slice(0, 20).map((item) => ({
      cssVar: item.cssVar,
      variableId: item.variableId,
      modeId: item.modeId,
      collectionName: item.collectionName,
      value: item.value,
    })),
    response: null,
  };

  if (args.apply && !args.dryRun) {
    const snapshot = await figmaApi('/v1/files/{file_key}/variables/local', { method: 'GET', config });
    if (snapshot.ok) {
      const stamp = nowIso().replace(/[:.]/g, '-');
      writeJson(resolve('tokens/figma', `rollback-${stamp}.json`), {
        capturedAt: nowIso(),
        payload: snapshot.data,
      });
    }

    const payload = {
      variableModeValues: filteredUpdates.map(({ collectionId, variableId, modeId, value }) => ({
        collectionId,
        variableId,
        modeId,
        value,
      })),
    };

    const response = await figmaApi('/v1/files/{file_key}/variables', {
      method: 'POST',
      body: payload,
      config,
    });

    report.response = {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      data: response.data,
    };

    if (!response.ok) {
      throw new Error(`Figma variables push failed (${response.status}): ${response?.data?.message || response.statusText}`);
    }
  }

  const reportPath = resolve('docs/code reports', `figma-push-report-${basename(nowIso().replace(/[:.]/g, '-'))}.json`);
  writeJson(reportPath, report);

  appendRolloutLog(`figma:push:variables ${args.dryRun ? 'dry-run' : 'apply'} updates=${report.stats.filteredUpdates} skipped=${report.stats.skipped}`);

  console.log(JSON.stringify({ ok: true, reportPath, ...report.stats }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
