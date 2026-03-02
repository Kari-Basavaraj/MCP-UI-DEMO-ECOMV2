// GET /api/health — simple health check for MCP server probe
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, server: "embedded-mcp", ts: Date.now() });
}
