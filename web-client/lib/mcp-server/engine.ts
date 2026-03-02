// ============================================================================
// MCP Bridge Engine — singleton InMemoryTransport client for API routes
// ============================================================================
// Replicates the pattern from mcp-server/src/openaiProxy.js getBridgeClient()
// which creates a linked InMemoryTransport pair connecting a Client to the
// MCP Server so we can call listTools / callTool / readResource over it.
// ============================================================================

import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMCPServer } from "./factory";

let bridgeClient: Client | null = null;
let bridgeInitPromise: Promise<Client> | null = null;

/**
 * Returns a singleton MCP Client connected to the embedded McpServer
 * via an in-memory transport pair. Safe to call from concurrent requests.
 */
export async function getBridgeClient(): Promise<Client> {
  if (bridgeClient) return bridgeClient;
  if (bridgeInitPromise) return bridgeInitPromise;

  bridgeInitPromise = (async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const mcpServer = createMCPServer();
    const client = new Client({ name: "vercel-bridge", version: "1.0.0" });

    await Promise.all([
      client.connect(clientTransport),
      mcpServer.connect(serverTransport),
    ]);

    bridgeClient = client;
    console.log("[mcp-engine] Bridge client connected to embedded MCP server");
    return client;
  })();

  return bridgeInitPromise;
}
