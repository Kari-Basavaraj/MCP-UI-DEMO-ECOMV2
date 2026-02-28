import { tool } from 'ai';
import { z } from 'zod';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface MCPServerConfig {
  url: string;
  type: 'sse' | 'http';
  headers?: KeyValuePair[];
}

export interface MCPClientManager {
  tools: Record<string, any>;
  cleanup: () => Promise<void>;
}

/**
 * Convert MCP tool JSON Schema to Zod schema.
 * Handles the common types used by our MCP server tools.
 */
function jsonSchemaToZod(schema: any): z.ZodType<any> {
  if (!schema || !schema.properties) return z.object({});
  const shape: Record<string, z.ZodType<any>> = {};
  const required = schema.required || [];

  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    let field: z.ZodType<any>;
    switch (prop.type) {
      case 'string':
        field = z.string();
        break;
      case 'number':
      case 'integer':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
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
 * Initialize MCP tools via HTTP bridge endpoints instead of SSE.
 * 
 * For each MCP server, fetches tool definitions from GET /api/mcp/tools
 * and creates AI SDK tool definitions that call POST /api/mcp/call.
 */
export async function initializeMCPClients(
  mcpServers: MCPServerConfig[] = [],
  abortSignal?: AbortSignal,
  userId?: string
): Promise<MCPClientManager> {
  let tools: Record<string, any> = {};

  for (const mcpServer of mcpServers) {
    try {
      // Derive HTTP base URL from SSE URL (strip /sse suffix)
      const baseUrl = mcpServer.url.replace(/\/sse\/?$/, '');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (mcpServer.headers) {
        for (const h of mcpServer.headers) {
          if (h.key) headers[h.key] = h.value || '';
        }
      }

      // Fetch tool definitions via HTTP
      const toolsRes = await fetch(`${baseUrl}/api/mcp/tools`, {
        headers,
        signal: abortSignal,
      });

      if (!toolsRes.ok) {
        console.error(`Failed to fetch tools from ${baseUrl}: ${toolsRes.status}`);
        continue;
      }

      const { tools: mcpTools } = await toolsRes.json();
      console.log(`MCP tools from ${baseUrl}:`, mcpTools.map((t: any) => t.name));

      // Create AI SDK tool definitions
      for (const mcpTool of mcpTools) {
        // Strip $schema key - it causes AI SDK to emit strict:true which
        // breaks OpenAI when tools have optional parameters
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
            const callRes = await fetch(`${baseUrl}/api/mcp/call`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ name: mcpTool.name, arguments: callArgs }),
            });

            if (!callRes.ok) {
              return { error: `Tool call failed: ${callRes.status}` };
            }

            const result = await callRes.json();

            // Separate the large UI HTML from what goes to the LLM.
            // Keep text content for the LLM; extract resource URIs for the UI
            // component to fetch and render separately.
            if (result.content && Array.isArray(result.content)) {
              const uiResources: Array<{ uri: string; mimeType: string }> = [];
              
              result.content = result.content.filter((item: any) => {
                if (
                  item.type === 'resource' &&
                  item.resource?.uri?.startsWith('ui://')
                ) {
                  // Save URI for the frontend component; don't send 371KB HTML to LLM
                  // Normalize mimeType: UIResourceRenderer needs exactly 'text/html'
                  const rawMime = item.resource.mimeType || '';
                  const normalizedMime = rawMime.startsWith('text/html') ? 'text/html' : rawMime;
                  uiResources.push({
                    uri: item.resource.uri,
                    mimeType: normalizedMime,
                  });
                  return false; // Remove from content sent to LLM
                }
                return true; // Keep text items
              });

              // Attach UI resource references for the tool-invocation component
              if (uiResources.length > 0) {
                result._uiResources = uiResources;
                result._mcpServerUrl = baseUrl;
              }
            }

            return result;
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
    }
  }

  return {
    tools,
    cleanup: async () => {
      // No persistent connections to clean up with HTTP approach
    },
  };
}
