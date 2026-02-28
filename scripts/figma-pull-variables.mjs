#!/usr/bin/env node
import {
  PATHS,
  appendRolloutLog,
  figmaApi,
  loadSyncConfig,
  nowIso,
  writeJson,
} from './figma-lib.mjs';
import { normalizeFigmaVariables } from './figma-normalizer.mjs';

async function main() {
  const config = loadSyncConfig();

  const response = await figmaApi('/v1/files/{file_key}/variables/local', {
    method: 'GET',
    config,
  });

  if (!response.ok) {
    const message = response?.data?.message || response.statusText || 'Unknown Figma API failure';
    throw new Error(`Figma variables pull failed (${response.status}): ${message}`);
  }

  writeJson(PATHS.variablesRaw, {
    fetchedAt: nowIso(),
    request: {
      status: response.status,
      url: response.url,
    },
    payload: response.data,
  });

  const normalized = normalizeFigmaVariables(response.data, { config });
  writeJson(PATHS.variablesNormalized, normalized);

  const idMap = {};
  for (const row of normalized.variables) {
    idMap[row.cssVar] = {
      variableId: row.variableId,
      figmaName: row.figmaName,
      collectionId: row.collectionId,
      collectionName: row.collectionName,
      modes: Object.fromEntries(
        Object.keys(row.modes).map((modeId) => [normalized.modeMeta[modeId]?.modeName || modeId, modeId])
      ),
    };
  }

  writeJson(PATHS.variableIds, {
    generatedAt: nowIso(),
    fileKey: normalized.fileKey,
    modeSelection: normalized.modeSelection,
    variables: idMap,
  });

  appendRolloutLog(`figma:pull:variables ok file=${normalized.fileKey} vars=${normalized.stats.variableCount} modes=${normalized.stats.modeCount}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        fileKey: normalized.fileKey,
        stats: normalized.stats,
        modeSelection: normalized.modeSelection,
        artifacts: [PATHS.variablesRaw, PATHS.variablesNormalized, PATHS.variableIds],
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
