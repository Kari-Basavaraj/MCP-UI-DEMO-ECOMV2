// POST /api/mcp/call — call an MCP tool by name
import { NextRequest, NextResponse } from "next/server";
import { getBridgeClient } from "@/lib/mcp-server/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, arguments: args } = body;

    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Invalid tool name" }, { status: 400 });
    }
    if (args != null && (typeof args !== "object" || Array.isArray(args))) {
      return NextResponse.json({ error: "Invalid tool arguments: expected object" }, { status: 400 });
    }

    const client = await getBridgeClient();
    const result = await client.callTool({
      name: name.trim(),
      arguments: args || {},
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/mcp/call] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to call tool" },
      { status: 500 }
    );
  }
}
