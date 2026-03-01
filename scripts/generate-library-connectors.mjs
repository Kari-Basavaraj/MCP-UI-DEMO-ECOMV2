#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = resolve(REPO_ROOT, 'docs/code reports/figma-components-inventory.json');
const outputPath = resolve(REPO_ROOT, 'figma/code-connect/components/Library.figma.tsx');
const FIGMA_FILE_KEY = 'dbPjFeLfAFp8Sz9YGPs0CZ';
const FIGMA_FILE_NAME = 'MCPUI-DS-V2';

function toUrl(nodeId) {
  return `https://www.figma.com/design/${FIGMA_FILE_KEY}/${FIGMA_FILE_NAME}?node-id=${String(nodeId).replace(':', '-')}`;
}

function pascalCase(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function loadComponents() {
  const raw = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const components = Array.isArray(raw.components) ? raw.components : [];

  const iconNames = new Set();
  components.forEach((c) => {
    const page = (c.containing_frame?.pageName || '').toLowerCase();
    const frame = (c.containing_frame?.name || '').toLowerCase();
    const setName = (c.containing_frame?.containingComponentSet?.name || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    const isIcon = page.includes('icon') || frame.includes('icon') || setName.includes('icon');
    if (isIcon) iconNames.add(c.name);
  });

  const others = components.filter((c) => !iconNames.has(c.name));
  const map = new Map();
  others.forEach((component) => {
    const name = component.name || 'Component';
    const nodeId = component.containing_frame?.containingComponentSet?.nodeId || component.containing_frame?.nodeId || component.node_id;
    if (!nodeId) return;
    if (!map.has(name)) {
      map.set(name, {
        name,
        nodeId,
        description: component.description || component.containing_frame?.pageName || '',
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function generateFile(entries) {
  const lines = [];
  lines.push('// AUTO-GENERATED: connectors for non-icon components');
  lines.push("import figma from '@figma/code-connect'");
  lines.push("import { FigmaStub } from '../../web-client/components/primitives/FigmaStub'");
  lines.push('');

  entries.forEach(({ name, nodeId, description }) => {
    const url = toUrl(nodeId);
    const propName = pascalCase(name);
    const desc = description ? description.replace(/"/g, '\\"') : '';
    lines.push(`figma.connect('${url}', {`);
    lines.push('  example: () => (');
    lines.push(`    <FigmaStub name="${name}" description="${desc}" data-figma-name="${propName}" />`);
    lines.push('  ),');
    lines.push('});');
    lines.push('');
  });

  writeFileSync(outputPath, `${lines.join('\n')}`);
  console.log(`Generated ${entries.length} library connectors -> ${outputPath}`);
}

const entries = loadComponents();
if (entries.length === 0) {
  console.error('No components found to generate connectors. Ensure inventory exists.');
  process.exit(1);
}

generateFile(entries);
