// ============================================================================
// Figma Webhook Receiver — Next.js API Route (Production)
// ============================================================================
// Receives Figma webhook POST payloads and triggers GitHub Actions via
// repository_dispatch. Deployed with the web-client (Vercel, etc.).
//
// Required env vars:
//   FIGMA_WEBHOOK_SECRET   — Passcode set when creating the Figma webhook
//   GITHUB_DISPATCH_TOKEN  — GitHub PAT with `repo` scope
//   GITHUB_REPO            — e.g. "Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
//   FIGMA_FILE_KEY         — e.g. "dbPjFeLfAFp8Sz9YGPs0CZ"
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FigmaWebhookPayload {
  event_type: string;
  file_key?: string;
  file_name?: string;
  timestamp?: string;
  passcode?: string;
  triggered_by?: { id: string; handle: string };
  description?: string;
  // LIBRARY_PUBLISH fields
  created_components?: unknown[];
  modified_components?: unknown[];
  deleted_components?: unknown[];
}

const EVENT_TO_DISPATCH: Record<string, string> = {
  FILE_UPDATE: 'figma_file_update',
  LIBRARY_PUBLISH: 'figma_library_publish',
};

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const ts = new Date().toISOString();

  // ── Env validation ────────────────────────────────────────────
  const secret = process.env.FIGMA_WEBHOOK_SECRET;
  const githubToken = process.env.GITHUB_DISPATCH_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;
  const fileKey = process.env.FIGMA_FILE_KEY;

  if (!githubToken || !githubRepo) {
    console.error(`[${requestId}] Missing GITHUB_DISPATCH_TOKEN or GITHUB_REPO`);
    return Response.json(
      { ok: false, error: 'Server misconfigured', requestId },
      { status: 500 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────
  let body: FigmaWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: 'Invalid JSON', requestId },
      { status: 400 },
    );
  }

  // ── Passcode validation ───────────────────────────────────────
  if (secret && body.passcode !== secret) {
    console.warn(`[${requestId}] Invalid passcode from ${req.headers.get('x-forwarded-for') || 'unknown'}`);
    return Response.json(
      { ok: false, error: 'Unauthorized', requestId },
      { status: 401 },
    );
  }

  // ── File key filter ───────────────────────────────────────────
  if (fileKey && body.file_key && body.file_key !== fileKey) {
    return Response.json({
      ok: true,
      message: 'Ignored — file key does not match',
      requestId,
    });
  }

  // ── Map event type ────────────────────────────────────────────
  const dispatchType = EVENT_TO_DISPATCH[body.event_type];
  if (!dispatchType) {
    return Response.json({
      ok: true,
      message: `Ignored — unhandled event type: ${body.event_type}`,
      requestId,
    });
  }

  // ── Dispatch to GitHub Actions ────────────────────────────────
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: dispatchType,
          client_payload: {
            file_key: body.file_key || fileKey,
            file_name: body.file_name || 'unknown',
            timestamp: body.timestamp || ts,
            webhook_event: body.event_type,
            triggered_by: body.triggered_by?.handle || 'figma-webhook',
            request_id: requestId,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[${requestId}] GitHub dispatch failed: ${res.status} ${errText}`);
      return Response.json(
        { ok: false, error: 'GitHub dispatch failed', status: res.status, requestId },
        { status: 502 },
      );
    }

    console.log(`[${requestId}] ✅ Dispatched ${dispatchType} to ${githubRepo}`);
    return Response.json({
      ok: true,
      message: 'GitHub Action triggered',
      dispatch_type: dispatchType,
      requestId,
    });
  } catch (err) {
    console.error(`[${requestId}] GitHub dispatch error:`, err);
    return Response.json(
      { ok: false, error: 'Internal error', requestId },
      { status: 500 },
    );
  }
}

// ── Health check ──────────────────────────────────────────────────
export async function GET() {
  return Response.json({
    ok: true,
    service: 'figma-webhook-receiver',
    timestamp: new Date().toISOString(),
    configured: {
      hasSecret: !!process.env.FIGMA_WEBHOOK_SECRET,
      hasGithubToken: !!process.env.GITHUB_DISPATCH_TOKEN,
      hasRepo: !!process.env.GITHUB_REPO,
      hasFileKey: !!process.env.FIGMA_FILE_KEY,
    },
  });
}
