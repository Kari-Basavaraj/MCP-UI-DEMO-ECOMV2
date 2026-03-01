#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = resolve(REPO_ROOT, 'docs/code reports/figma-components-inventory.json');
const outputPath = resolve(REPO_ROOT, 'figma/code-connect/components/Icons.figma.tsx');
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

function loadIcons() {
  const raw = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const components = Array.isArray(raw.components) ? raw.components : [];

  const icons = components.filter((c) => {
    const page = (c.containing_frame?.pageName || '').toLowerCase();
    const frame = (c.containing_frame?.name || '').toLowerCase();
    const setName = (c.containing_frame?.containingComponentSet?.name || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    return page.includes('icon') || frame.includes('icon') || setName.includes('icon') || name.match(/^(alert|activity|airplay|align|anchor|arrow|battery|bell|bluetooth|book|bookmark|box|calendar|camera|cast|check|chevron|chevrons|circle|clipboard|cloud|code|command|compass|copy|corner|cpu|credit|crop|crosshair|crown|database|download|edit|eye|file|filter|flag|folder|globe|grid|hard|hash|headphones|heart|help|hexagon|home|image|inbox|info|key|layout|life|light|link|list|lock|log|mail|map|maximize|menu|mic|minimize|minus|monitor|moon|mouse|music|navigation|network|octagon|package|paperclip|pause|pen|phone|pie|play|plus|pointer|power|printer|radio|refresh|repeat|rewind|rocket|rss|save|scan|scissors|search|send|server|settings|share|shield|shopping|shuffle|skip|slash|sliders|smartphone|snowflake|speaker|square|star|stop|sun|sunrise|sunset|tablet|tag|terminal|thumbs|toggle|tool|trash|triangle|truck|tv|umbrella|undo|unlock|upload|user|video|volume|watch|wifi|wind|zoom)/);
  });

  const map = new Map();
  icons.forEach((icon) => {
    const name = icon.name || 'Icon';
    const nodeId = icon.containing_frame?.containingComponentSet?.nodeId || icon.containing_frame?.nodeId || icon.node_id;
    if (!nodeId) return;
    if (!map.has(name)) {
      map.set(name, { name, nodeId });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function generateFile(entries) {
  const lines = [];
  lines.push('// AUTO-GENERATED: connectors for icon components');
  lines.push("import figma from '@figma/code-connect'");
  lines.push("import { Icon } from '../../web-client/components/icons/Icon'");
  lines.push('');

  entries.forEach(({ name, nodeId }) => {
    const url = toUrl(nodeId);
    const propName = pascalCase(name);
    lines.push(`figma.connect('${url}', {`);
    lines.push('  example: () => (');
    lines.push(`    <Icon name="${name}" ariaLabel="${name}" data-figma-name="${propName}" />`);
    lines.push('  ),');
    lines.push('});');
    lines.push('');
  });

  writeFileSync(outputPath, `${lines.join('\n')}`);
  console.log(`Generated ${entries.length} icon connectors -> ${outputPath}`);
}

const entries = loadIcons();
if (entries.length === 0) {
  console.error('No icons found in inventory. Run figma inventory first.');
  process.exit(1);
}

generateFile(entries);
