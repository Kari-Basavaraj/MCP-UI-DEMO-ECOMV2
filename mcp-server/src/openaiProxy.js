import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MUTATING_TOOLS = [
  "add_to_cart",
  "remove_from_cart",
  "checkout",
  "place_order",
  "add_to_wishlist",
  "remove_from_wishlist",
];

const asBool = (value, fallback = false) => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseList = (value, fallback = []) => {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getAuthToken = (req) => {
  const mcpHeader = req.get("x-mcp-auth");
  if (mcpHeader) return mcpHeader.trim();
  const authHeader = req.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
};

const pickModelOptions = (body) => {
  const allowedKeys = [
    "temperature",
    "max_tokens",
    "top_p",
    "presence_penalty",
    "frequency_penalty",
    "stop",
    "seed",
    "response_format",
    "stream",
  ];

  return allowedKeys.reduce((acc, key) => {
    if (body && Object.prototype.hasOwnProperty.call(body, key)) {
      acc[key] = body[key];
    }
    return acc;
  }, {});
};

export const startOpenAIProxy = ({
  port = 8787,
  listTools = () => [],
  executeTool = async () => ({ content: [{ type: "text", text: JSON.stringify({ error: "Tool execution not configured" }) }] }),
  createMCPServer = null,
} = {}) => {
  const app = express();
  const securityMode = process.env.MCP_SECURITY_MODE || "local";
  const allowedOrigins = parseList(process.env.MCP_ALLOWED_ORIGINS);
  const authEnabled = asBool(process.env.MCP_BRIDGE_AUTH_ENABLED, false);
  const bridgeToken = process.env.MCP_BRIDGE_AUTH_TOKEN || "";
  const mutatingAllowlist = new Set(parseList(process.env.MCP_MUTATING_TOOL_ALLOWLIST, DEFAULT_MUTATING_TOOLS));
  const maxArgBytes = Number(process.env.MCP_MAX_ARGUMENT_BYTES || 8192);
  const rateLimitEnabled = asBool(process.env.MCP_RATE_LIMIT_ENABLED, true);
  const rateLimitWindowMs = Number(process.env.MCP_RATE_LIMIT_WINDOW_MS || 60000);
  const rateLimitMax = Number(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 120);
  const requestCounters = new Map();

  app.use(cors({
    origin: (origin, callback) => {
      if (securityMode !== "strict" || allowedOrigins.length === 0 || !origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    const configured = Boolean(process.env.OPENAI_API_KEY);
    res.json({
      ok: true,
      aiConfigured: configured,
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    });
  });

  const handleChatCompletion = async (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY in server environment",
      });
    }

    const { messages, tools, tool_choice, model } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request: messages must be an array",
      });
    }

    const payload = {
      model: model || process.env.OPENAI_MODEL || DEFAULT_MODEL,
      messages,
      tools,
      tool_choice,
      ...pickModelOptions(req.body),
    };

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({
        error: error?.message || "Failed to reach OpenAI",
      });
    }
  };

  app.post("/api/openai/chat", handleChatCompletion);

  app.get("/api/tools", async (_req, res) => {
    try {
      const tools = await listTools();
      return res.json({ tools });
    } catch (error) {
      return res.status(500).json({
        error: error?.message || "Failed to list tools",
      });
    }
  });

  app.post("/api/tools/:toolName", async (req, res) => {
    const { toolName } = req.params;

    try {
      const result = await executeTool(toolName, req.body || {});
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error?.message || "Failed to execute tool" }),
          },
        ],
      });
    }
  });

  // ── MCP SSE Transport ──────────────────────────────────────────
  if (typeof createMCPServer === "function") {
    const sseTransports = new Map();

    app.get("/sse", async (req, res) => {
      console.error("New SSE connection");
      const transport = new SSEServerTransport("/messages", res);
      const mcpServer = createMCPServer();
      sseTransports.set(transport.sessionId, { mcpServer, transport });

      res.on("close", () => {
        console.error(`SSE connection closed: ${transport.sessionId}`);
        sseTransports.delete(transport.sessionId);
      });

      await mcpServer.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;
      const entry = sseTransports.get(sessionId);
      if (entry) {
        await entry.transport.handlePostMessage(req, res);
      } else {
        res.status(400).json({ error: "No active SSE session for id: " + sessionId });
      }
    });

    console.error("MCP SSE transport enabled at /sse");

    // ── HTTP Tool Bridge (bypass SSE for AI SDK compatibility) ──
    // Uses an in-memory transport to talk to the McpServer directly
    let bridgeClient = null;
    let bridgeInitPromise = null;

    async function getBridgeClient() {
      if (bridgeClient) return bridgeClient;
      if (bridgeInitPromise) return bridgeInitPromise;
      bridgeInitPromise = (async () => {
        const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
        const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const mcpServer = createMCPServer();
        bridgeClient = new Client({ name: "http-bridge", version: "1.0.0" });
        await Promise.all([
          bridgeClient.connect(clientTransport),
          mcpServer.connect(serverTransport),
        ]);
        console.error("✓ HTTP bridge client connected to MCP server");
        return bridgeClient;
      })();
      return bridgeInitPromise;
    }

    // Eagerly initialize
    getBridgeClient().catch((e) => console.error("Bridge init error:", e));

    app.get("/api/mcp/tools", async (_req, res) => {
      try {
        const client = await getBridgeClient();
        const result = await client.listTools();
        return res.json({ tools: result.tools });
      } catch (error) {
        return res.status(500).json({ error: error?.message || "Failed to list tools" });
      }
    });

    app.post("/api/mcp/call", async (req, res) => {
      try {
        const { name, arguments: args } = req.body;
        if (typeof name !== "string" || name.trim() === "") {
          return res.status(400).json({ error: "Invalid tool name" });
        }
        if (args != null && (typeof args !== "object" || Array.isArray(args))) {
          return res.status(400).json({ error: "Invalid tool arguments: expected object" });
        }
        const argSize = Buffer.byteLength(JSON.stringify(args || {}), "utf8");
        if (argSize > maxArgBytes) {
          return res.status(413).json({ error: `Tool arguments too large (${argSize} bytes)` });
        }

        const toolName = name.trim();
        const isMutatingTool = DEFAULT_MUTATING_TOOLS.includes(toolName);
        if (isMutatingTool && !mutatingAllowlist.has(toolName)) {
          return res.status(403).json({ error: `Tool not allowlisted: ${toolName}` });
        }
        if (authEnabled && isMutatingTool) {
          if (!bridgeToken) {
            return res.status(500).json({ error: "Bridge auth enabled but MCP_BRIDGE_AUTH_TOKEN is not set" });
          }
          const incomingToken = getAuthToken(req);
          if (!incomingToken || incomingToken !== bridgeToken) {
            return res.status(401).json({ error: "Unauthorized MCP tool call" });
          }
        }
        if (rateLimitEnabled && isMutatingTool) {
          const bucketKey = req.ip || req.socket.remoteAddress || "unknown";
          const now = Date.now();
          const current = requestCounters.get(bucketKey) || { count: 0, windowStart: now };
          if (now - current.windowStart >= rateLimitWindowMs) {
            current.count = 0;
            current.windowStart = now;
          }
          current.count += 1;
          requestCounters.set(bucketKey, current);
          if (current.count > rateLimitMax) {
            return res.status(429).json({ error: "Rate limit exceeded for mutable MCP tool calls" });
          }
        }

        const client = await getBridgeClient();
        const result = await client.callTool({ name: toolName, arguments: args || {} });
        return res.json(result);
      } catch (error) {
        return res.status(500).json({ error: error?.message || "Failed to call tool" });
      }
    });

    // Serve UI resource HTML by URI (used by frontend to render widgets)
    app.get("/api/mcp/resource", async (req, res) => {
      try {
        const uri = req.query.uri;
        if (!uri) return res.status(400).json({ error: "Missing uri parameter" });
        const client = await getBridgeClient();
        const result = await client.readResource({ uri });
        const content = result.contents?.[0];
        if (content?.text) {
          res.set("Content-Type", content.mimeType || "text/html");
          return res.send(content.text);
        }
        return res.status(404).json({ error: "Resource not found" });
      } catch (error) {
        return res.status(500).json({ error: error?.message || "Failed to read resource" });
      }
    });

    console.error("HTTP tool bridge enabled at /api/mcp/tools, /api/mcp/call, /api/mcp/resource");
  }

  const server = app.listen(port, () => {
    console.error(`Server listening on :${port}`);
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`OpenAI proxy port ${port} already in use, skipping new listener`);
      return;
    }

    throw error;
  });

  return server;
};
