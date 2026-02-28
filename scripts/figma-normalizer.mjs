#!/usr/bin/env node
import {
  PATHS,
  formatCssValue,
  inferCssVarName,
  nowIso,
  readJson,
  resolveFileKey,
} from './figma-lib.mjs';

function getCollections(rawData) {
  return rawData?.meta?.variableCollections || rawData?.variableCollections || {};
}

function getVariables(rawData) {
  return rawData?.meta?.variables || rawData?.variables || {};
}

function resolveValue({ variableId, modeId, variablesById, collectionById, visited = [] }) {
  const cycle = [...visited, variableId];
  if (visited.includes(variableId)) {
    return { value: null, aliasChain: cycle, reason: 'cycle' };
  }

  const variable = variablesById[variableId];
  if (!variable) {
    return { value: null, aliasChain: cycle, reason: 'missing-variable' };
  }

  const collection = collectionById[variable.variableCollectionId] || null;
  const defaultModeId = collection?.defaultModeId;
  const valueByMode = variable.valuesByMode || {};
  const raw = valueByMode[modeId] ?? (defaultModeId ? valueByMode[defaultModeId] : undefined);

  if (raw?.type === 'VARIABLE_ALIAS' && raw.id) {
    return resolveValue({
      variableId: raw.id,
      modeId,
      variablesById,
      collectionById,
      visited: cycle,
    });
  }

  return {
    value: raw,
    aliasChain: cycle,
    reason: raw == null ? 'empty' : 'resolved',
  };
}

export function normalizeFigmaVariables(rawData, { config }) {
  const tokenMap = readJson(PATHS.tokenNameMap, { nameMap: {} }) || { nameMap: {} };
  const collections = getCollections(rawData);
  const variables = getVariables(rawData);

  const modeMeta = {};
  Object.values(collections).forEach((collection) => {
    (collection?.modes || []).forEach((mode) => {
      modeMeta[mode.modeId] = {
        modeId: mode.modeId,
        modeName: mode.name,
        collectionId: collection.id,
        collectionName: collection.name,
        isDefault: collection.defaultModeId === mode.modeId,
      };
    });
  });

  const byMode = {};
  const variableRows = [];

  Object.values(variables).forEach((variable) => {
    const collection = collections[variable.variableCollectionId] || null;
    const modeIds = (collection?.modes || []).map((mode) => mode.modeId);
    const cssVar = inferCssVarName(variable.name, tokenMap.nameMap);

    const modes = {};
    modeIds.forEach((modeId) => {
      const resolved = resolveValue({
        variableId: variable.id,
        modeId,
        variablesById: variables,
        collectionById: collections,
      });

      const cssValue = formatCssValue({
        cssVar,
        value: resolved.value,
        resolvedType: variable.resolvedType,
        figmaName: variable.name,
      });

      modes[modeId] = {
        value: cssValue,
        resolvedType: variable.resolvedType,
        aliasChain: resolved.aliasChain,
        reason: resolved.reason,
      };

      if (cssValue != null) {
        if (!byMode[modeId]) byMode[modeId] = {};
        byMode[modeId][cssVar] = cssValue;
      }
    });

    variableRows.push({
      variableId: variable.id,
      figmaName: variable.name,
      cssVar,
      resolvedType: variable.resolvedType,
      collectionId: variable.variableCollectionId,
      collectionName: collection?.name || '',
      modes,
    });
  });

  for (const modeId of Object.keys(byMode)) {
    const sorted = Object.fromEntries(
      Object.entries(byMode[modeId]).sort(([a], [b]) => a.localeCompare(b))
    );
    byMode[modeId] = sorted;
  }

  variableRows.sort((a, b) => a.cssVar.localeCompare(b.cssVar));

  const modeEntries = Object.values(modeMeta);
  const lightMode = modeEntries.find((mode) => mode.modeName.toLowerCase().includes('light')) || modeEntries[0] || null;
  const darkMode = modeEntries.find((mode) => mode.modeName.toLowerCase().includes('dark')) || null;

  return {
    generatedAt: nowIso(),
    fileKey: resolveFileKey(config),
    collections: Object.values(collections)
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        defaultModeId: collection.defaultModeId,
        modes: collection.modes,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    modeMeta,
    modeSelection: {
      lightModeId: lightMode?.modeId || null,
      lightModeName: lightMode?.modeName || null,
      darkModeId: darkMode?.modeId || null,
      darkModeName: darkMode?.modeName || null,
    },
    byMode,
    variables: variableRows,
    stats: {
      collectionCount: Object.keys(collections).length,
      variableCount: variableRows.length,
      modeCount: Object.keys(modeMeta).length,
      tokenCountByMode: Object.fromEntries(Object.entries(byMode).map(([modeId, tokens]) => [modeId, Object.keys(tokens).length])),
    },
  };
}
