#!/usr/bin/env node
// ============================================================================
// Register/Manage Figma Webhooks via REST API
// ============================================================================
// Usage:
//   node scripts/figma-webhook-manage.mjs create --url https://your-domain.com/webhook
//   node scripts/figma-webhook-manage.mjs list
//   node scripts/figma-webhook-manage.mjs delete --id <webhook_id>
//   node scripts/figma-webhook-manage.mjs test
//
// Required env vars:
//   FIGMA_ACCESS_TOKEN
//   FIGMA_FILE_KEY (or pass via --file-key)
//
// Options:
//   --url <url>           Webhook endpoint URL (for create)
//   --passcode <string>   Passcode for webhook verification (for create)
//   --id <webhook_id>     Webhook ID (for delete)
//   --file-key <key>      Override FIGMA_FILE_KEY
//   --event-type <type>   Event type: FILE_UPDATE (default), LIBRARY_PUBLISH
// ============================================================================

const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;

if (!FIGMA_ACCESS_TOKEN) {
  console.error('Error: FIGMA_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const command = args[0];

function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const fileKey = getArg('file-key', FIGMA_FILE_KEY);
const FIGMA_API = 'https://api.figma.com/v2';

async function figmaFetch(path, options = {}) {
  const url = `${FIGMA_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Figma-Token': FIGMA_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function createWebhook() {
  const url = getArg('url');
  const passcode = getArg('passcode', '');
  const eventType = getArg('event-type', 'FILE_UPDATE');

  if (!url) {
    console.error('Error: --url is required for create');
    console.error('Usage: node figma-webhook-manage.mjs create --url https://your-domain.com/webhook');
    process.exit(1);
  }

  if (!fileKey) {
    console.error('Error: FIGMA_FILE_KEY or --file-key is required');
    process.exit(1);
  }

  console.log(`Creating webhook for file ${fileKey}...`);
  console.log(`  Event: ${eventType}`);
  console.log(`  URL:   ${url}`);
  console.log(`  Passcode: ${passcode ? '***' : '(none)'}`);

  const body = {
    event_type: eventType,
    team_id: '', // Will be auto-resolved from file
    endpoint: url,
    passcode: passcode || undefined,
    description: `Figma→Code auto-sync for ${fileKey}`,
  };

  // The Figma API requires team_id, so we need to resolve it from the file
  const fileRes = await figmaFetch(`/../v1/files/${fileKey}?depth=1`);
  if (!fileRes.ok) {
    console.error(`Failed to fetch file info: ${fileRes.status}`);
    console.error(fileRes.data);
    process.exit(1);
  }

  // Get team ID from file metadata — needs the project endpoint
  const projectRes = await figmaFetch(`/../v1/files/${fileKey}/projects`);
  // Fallback: use v2 webhooks with file-scoped approach
  
  const result = await figmaFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      event_type: eventType,
      team_id: getArg('team-id', ''),
      endpoint: url,
      passcode: passcode || undefined,
      description: `Figma→Code auto-sync for ${fileKey}`,
    }),
  });

  if (result.ok) {
    console.log('\n✅ Webhook created successfully!');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.error(`\n❌ Failed to create webhook: ${result.status}`);
    console.error(JSON.stringify(result.data, null, 2));
    console.log('\nNote: Figma webhooks require a team_id. Pass --team-id <id>');
    console.log('Find your team ID: Go to Figma → your team page → the ID is in the URL');
    console.log('Example: https://www.figma.com/files/team/123456789/...');
    console.log('                                      ^^^^^^^^^');
  }
}

async function listWebhooks() {
  const teamId = getArg('team-id');
  if (!teamId) {
    console.error('Error: --team-id is required for list');
    console.error('Usage: node figma-webhook-manage.mjs list --team-id <team_id>');
    process.exit(1);
  }

  console.log(`Listing webhooks for team ${teamId}...`);
  const result = await figmaFetch(`/webhooks?team_id=${teamId}`);

  if (result.ok) {
    const webhooks = result.data?.webhooks || [];
    console.log(`\nFound ${webhooks.length} webhook(s):\n`);
    for (const wh of webhooks) {
      console.log(`  ID: ${wh.id}`);
      console.log(`  Event: ${wh.event_type}`);
      console.log(`  URL: ${wh.endpoint}`);
      console.log(`  Status: ${wh.status}`);
      console.log(`  Description: ${wh.description || '—'}`);
      console.log('  ───');
    }
  } else {
    console.error(`Failed: ${result.status}`);
    console.error(result.data);
  }
}

async function deleteWebhook() {
  const id = getArg('id');
  if (!id) {
    console.error('Error: --id is required for delete');
    process.exit(1);
  }

  console.log(`Deleting webhook ${id}...`);
  const result = await figmaFetch(`/webhooks/${id}`, { method: 'DELETE' });

  if (result.ok || result.status === 200) {
    console.log('✅ Webhook deleted');
  } else {
    console.error(`Failed: ${result.status}`);
    console.error(result.data);
  }
}

async function testWebhook() {
  console.log('Sending test payload to local webhook receiver...');
  const receiverUrl = getArg('url', 'http://localhost:4848');

  const testPayload = {
    event_type: 'FILE_UPDATE',
    file_key: fileKey || 'test-file-key',
    file_name: 'MCPUI-DS-V2 (Test)',
    timestamp: new Date().toISOString(),
    passcode: getArg('passcode', ''),
    triggered_by: { id: 'test', handle: 'test-user' },
  };

  try {
    const res = await fetch(receiverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });
    const data = await res.json().catch(() => res.text());
    console.log(`\nResponse (${res.status}):`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to connect to ${receiverUrl}: ${err.message}`);
    console.log('\nMake sure the webhook receiver is running:');
    console.log('  node scripts/figma-webhook-receiver.mjs');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const commands = { create: createWebhook, list: listWebhooks, delete: deleteWebhook, test: testWebhook };

if (!command || !commands[command]) {
  console.log('Figma Webhook Manager');
  console.log('');
  console.log('Usage: node scripts/figma-webhook-manage.mjs <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  create    Create a new Figma webhook');
  console.log('  list      List existing webhooks');
  console.log('  delete    Delete a webhook by ID');
  console.log('  test      Send a test payload to local receiver');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/figma-webhook-manage.mjs create --url https://your.domain/webhook --team-id 12345 --passcode mysecret');
  console.log('  node scripts/figma-webhook-manage.mjs list --team-id 12345');
  console.log('  node scripts/figma-webhook-manage.mjs test --url http://localhost:4848');
  console.log('  node scripts/figma-webhook-manage.mjs delete --id webhook-id-here');
  process.exit(0);
}

commands[command]();
