// ============================================================================
// Embedded MCP Client — uses in-process bridge instead of HTTP
// ============================================================================
// For Vercel production: calls the MCP server directly via
// InMemoryTransport, avoiding self-referencing HTTP requests.
// ============================================================================

import { tool } from "ai";
import { z } from "zod";
import { getBridgeClient } from "@/lib/mcp-server/engine";

/**
 * Convert MCP tool JSON Schema to Zod schema.
 */
function jsonSchemaToZod(schema: any): z.ZodType<any> {
  if (!schema || !schema.properties) return z.object({});
  const shape: Record<string, z.ZodType<any>> = {};
  const required = schema.required || [];

  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    let field: z.ZodType<any>;
    switch (prop.type) {
      case "string":
        field = z.string();
        break;
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(prop.items ? jsonSchemaToZod(prop.items) : z.any());
        break;
      default:
        field = z.any();
    }
    if (prop.description) {
      field = (field as any).describe(prop.description);
    }
    if (!required.includes(key)) {
      field = field.optional();
    }
    shape[key] = field;
  }
  return z.object(shape);
}

/**
 * Initialize MCP tools using the in-process bridge (no HTTP).
 * Returns tools compatible with the AI SDK, with `_uiResources`
 * and `_mcpServerUrl` attached to results for widget rendering.
 *
 * @param sameOriginUrl - The browser-accessible base URL for widget HTML
 *   fetching (e.g. "https://mcp-ui-demo-ecomv2.vercel.app" or "").
 *   Set to "" for same-origin.
 */
export async function initializeEmbeddedMCPTools(
  sameOriginUrl: string,
  userId?: string,
): Promise<{ tools: Record<string, any>; cleanup: () => Promise<void> }> {
  const tools: Record<string, any> = {};

  try {
    const client = await getBridgeClient();
    const { tools: mcpTools } = await client.listTools();

    console.log(
      "[embedded-mcp] Tools loaded:",
      mcpTools.map((t: any) => t.name),
    );

    for (const mcpTool of mcpTools) {
      const cleanSchema = { ...mcpTool.inputSchema };
      delete cleanSchema.$schema;
      const parameters = jsonSchemaToZod(cleanSchema);

      tools[mcpTool.name] = tool({
        description: mcpTool.description || mcpTool.name,
        parameters,
        execute: async (args: any) => {
          const callArgs = {
            ...(args || {}),
            ...(userId ? { userId } : {}),
          };

          const result = await client.callTool({
            name: mcpTool.name,
            arguments: callArgs,
          });

          // Process result: strip HTML resources, attach URIs for frontend
          const resultObj = result as any;
          if (resultObj.content && Array.isArray(resultObj.content)) {
            const uiResources: Array<{ uri: string; mimeType: string }> = [];

            resultObj.content = resultObj.content.filter((item: any) => {
              if (
                item.type === "resource" &&
                item.resource?.uri?.startsWith("ui://")
              ) {
                const rawMime = item.resource.mimeType || "";
                const normalizedMime = rawMime.startsWith("text/html")
                  ? "text/html"
                  : rawMime;
                uiResources.push({
                  uri: item.resource.uri,
                  mimeType: normalizedMime,
                });
                return false; // Don't send HTML to LLM
              }
              return true;
            });

            if (uiResources.length > 0) {
              resultObj._uiResources = uiResources;
              resultObj._mcpServerUrl = sameOriginUrl;
            }
          }

          return resultObj;
        },
      });
    }
  } catch (error) {
    console.error("[embedded-mcp] Failed to initialize:", error);
  }

  return {
    tools,
    cleanup: async () => {},
  };
}
