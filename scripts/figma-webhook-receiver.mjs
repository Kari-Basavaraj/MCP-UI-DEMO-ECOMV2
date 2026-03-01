#!/usr/bin/env node
// ============================================================================
// Figma Webhook Receiver → GitHub repository_dispatch
// ============================================================================
// A lightweight HTTP server that receives Figma webhook events and triggers
// the figma-webhook-sync GitHub Action via repository_dispatch.
//
// Deployment options:
//   1. Local dev:    node scripts/figma-webhook-receiver.mjs
//   2. Cloudflare:   Copy the handleRequest() logic into a Worker
//   3. Vercel Edge:  Export handleRequest as the default handler
//   4. GitHub App:   Use the Figma Webhook → GitHub App integration
//
// Required env vars:
//   FIGMA_WEBHOOK_PASSCODE  — The passcode you set when creating the Figma webhook
//   GITHUB_TOKEN            — GitHub PAT with repo scope (for repository_dispatch)
//   GITHUB_REPO             — e.g. "Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
//   FIGMA_FILE_KEY          — Your Figma file key (to filter events)
//
// Optional:
//   WEBHOOK_PORT            — Port to listen on (default: 4848)
// ============================================================================

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Auto-load .env.local from project root ───────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnvFile(filename) {
  try {
    const filepath = resolve(ROOT, filename);
    const content = readFileSync(filepath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Only set if not already in env (explicit env vars take precedence)
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // File not found — that's fine, use env vars directly
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const PORT = parseInt(process.env.WEBHOOK_PORT || '4848', 10);
const FIGMA_PASSCODE = process.env.FIGMA_WEBHOOK_PASSCODE || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Kari-Basavaraj/MCP-UI-DEMO-ECOMV2';
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY || '';

// ── Logging ──────────────────────────────────────────────────────────────────

function log(level, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  };
  console.log(JSON.stringify(entry));
}

// ── GitHub dispatch ──────────────────────────────────────────────────────────

async function triggerGitHubDispatch(eventType, payload) {
  if (!GITHUB_TOKEN) {
    log('error', 'GITHUB_TOKEN not set — cannot trigger dispatch');
    return { ok: false, error: 'GITHUB_TOKEN not configured' };
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;
  const body = {
    event_type: eventType,
    client_payload: payload,
  };

  log('info', `Triggering repository_dispatch: ${eventType}`, { repo: GITHUB_REPO });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 204) {
    log('info', 'GitHub dispatch triggered successfully');
    return { ok: true };
  } else {
    const text = await res.text();
    log('error', `GitHub dispatch failed: ${res.status}`, { body: text });
    return { ok: false, error: `GitHub API ${res.status}: ${text}` };
  }
}

// ── Webhook handler ──────────────────────────────────────────────────────────

async function handleWebhook(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'figma-webhook-receiver' }));
    return;
  }

  // Parse body
  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  log('info', 'Received webhook', {
    event_type: body.event_type,
    file_key: body.file_key,
    timestamp: body.timestamp,
  });

  // ── Passcode verification ──
  if (FIGMA_PASSCODE && body.passcode !== FIGMA_PASSCODE) {
    log('warn', 'Invalid passcode — rejecting webhook');
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid passcode' }));
    return;
  }

  // ── Figma webhook ping (initial verification) ──
  if (body.event_type === 'PING') {
    log('info', 'Figma PING received — responding OK');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'PONG' }));
    return;
  }

  // ── Filter by file key ──
  if (FIGMA_FILE_KEY && body.file_key && body.file_key !== FIGMA_FILE_KEY) {
    log('info', `Ignoring webhook for different file: ${body.file_key}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Ignored — different file' }));
    return;
  }

  // ── Map Figma events to GitHub dispatch types ──
  const eventMap = {
    FILE_UPDATE: 'figma_file_update',
    FILE_VERSION_UPDATE: 'figma_file_update',
    LIBRARY_PUBLISH: 'figma_library_publish',
  };

  const dispatchType = eventMap[body.event_type];
  if (!dispatchType) {
    log('info', `Ignoring unhandled event type: ${body.event_type}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: `Ignored event: ${body.event_type}` }));
    return;
  }

  // ── Debounce: Figma sends many FILE_UPDATE events for a single save ──
  // In production, add a 30-second debounce per file_key.
  // For now, we dispatch immediately.

  // ── Trigger GitHub Action ──
  const result = await triggerGitHubDispatch(dispatchType, {
    file_key: body.file_key,
    file_name: body.file_name,
    webhook_event: body.event_type,
    timestamp: body.timestamp || new Date().toISOString(),
    triggered_by: body.triggered_by?.handle || 'webhook',
  });

  if (result.ok) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'GitHub Action triggered', dispatch_type: dispatchType }));
  } else {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: result.error }));
  }
}

// ── Health check (GET) ───────────────────────────────────────────────────────

function handleRequest(req, res) {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      service: 'figma-webhook-receiver',
      repo: GITHUB_REPO,
      hasPasscode: !!FIGMA_PASSCODE,
      hasGithubToken: !!GITHUB_TOKEN,
      fileKey: FIGMA_FILE_KEY || 'not filtered',
    }));
    return;
  }
  handleWebhook(req, res);
}

// ── Start server ─────────────────────────────────────────────────────────────

const server = createServer(handleRequest);
server.listen(PORT, () => {
  log('info', `Figma webhook receiver listening on :${PORT}`, {
    repo: GITHUB_REPO,
    hasPasscode: !!FIGMA_PASSCODE,
    hasGithubToken: !!GITHUB_TOKEN,
    fileKey: FIGMA_FILE_KEY || 'not filtered',
  });
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  Figma Webhook Receiver');
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  GitHub repo: ${GITHUB_REPO}`);
  console.log(`  File filter: ${FIGMA_FILE_KEY || 'none (all files)'}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health  — Health check`);
  console.log(`  POST http://localhost:${PORT}/         — Figma webhook receiver`);
  console.log('');
  console.log('To create a Figma webhook pointing here:');
  console.log('  See FIGMA-TO-CODE-CICD-AUTOMATION/10-WEBHOOK-SETUP.md');
  console.log('');
});
