// GET /api/mcp/tools — list all available MCP tools
import { NextResponse } from "next/server";
import { getBridgeClient } from "@/lib/mcp-server/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await getBridgeClient();
    const result = await client.listTools();
    return NextResponse.json({ tools: result.tools });
  } catch (error: any) {
    console.error("[api/mcp/tools] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list tools" },
      { status: 500 }
    );
  }
}
