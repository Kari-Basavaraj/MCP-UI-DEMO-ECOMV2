// GET /api/mcp/resource?uri=... — serve widget HTML by resource URI
import { NextRequest, NextResponse } from "next/server";
import { getBridgeClient } from "@/lib/mcp-server/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const uri = req.nextUrl.searchParams.get("uri");
    if (!uri) {
      return NextResponse.json({ error: "Missing uri parameter" }, { status: 400 });
    }

    const client = await getBridgeClient();
    const result = await client.readResource({ uri });
    const content = result.contents?.[0];

    if (content && "text" in content && content.text) {
      return new NextResponse(content.text, {
        status: 200,
        headers: {
          "Content-Type": (content.mimeType as string) || "text/html",
        },
      });
    }

    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[api/mcp/resource] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to read resource" },
      { status: 500 }
    );
  }
}
