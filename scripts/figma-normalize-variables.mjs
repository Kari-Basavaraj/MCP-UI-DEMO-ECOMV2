#!/usr/bin/env node
import { PATHS, appendRolloutLog, loadSyncConfig, nowIso, readJson, writeJson } from './figma-lib.mjs';
import { normalizeFigmaVariables } from './figma-normalizer.mjs';

async function main() {
  const config = loadSyncConfig();
  const raw = readJson(PATHS.variablesRaw, null);

  if (!raw?.payload) {
    throw new Error(`Missing ${PATHS.variablesRaw}. Run npm run figma:pull:variables first.`);
  }

  const normalized = normalizeFigmaVariables(raw.payload, { config });
  writeJson(PATHS.variablesNormalized, normalized);

  const idMap = {};
  for (const row of normalized.variables) {
    idMap[row.cssVar] = {
      variableId: row.variableId,
      figmaName: row.figmaName,
      collectionId: row.collectionId,
      collectionName: row.collectionName,
      modes: Object.fromEntries(
        Object.keys(row.modes).map((modeId) => [normalized.modeMeta[modeId]?.modeName || modeId, modeId]),
      ),
    };
  }

  writeJson(PATHS.variableIds, {
    generatedAt: nowIso(),
    fileKey: normalized.fileKey,
    modeSelection: normalized.modeSelection,
    variables: idMap,
  });

  appendRolloutLog(`figma:normalize:variables ok vars=${normalized.stats.variableCount} modes=${normalized.stats.modeCount}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        stats: normalized.stats,
        modeSelection: normalized.modeSelection,
        artifacts: [PATHS.variablesNormalized, PATHS.variableIds],
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
