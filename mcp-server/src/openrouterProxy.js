import express from "express";
import cors from "cors";

const DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free";

const pickOpenRouterOptions = (body) => {
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

export const startOpenRouterProxy = ({
  port = 8787,
  listTools = () => [],
  executeTool = async () => ({ content: [{ type: "text", text: JSON.stringify({ error: "Tool execution not configured" }) }] }),
} = {}) => {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    });
  });

  app.post("/api/openrouter/chat", async (req, res) => {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENROUTER_API_KEY in server environment",
      });
    }

    const { messages, tools, tool_choice, model } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request: messages must be an array",
      });
    }

    const payload = {
      model: model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages,
      tools,
      tool_choice,
      ...pickOpenRouterOptions(req.body),
    };

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": req.headers.origin || req.headers.referer || "http://localhost",
          "X-Title": "MCP E-Commerce",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({
        error: error?.message || "Failed to reach OpenRouter",
      });
    }
  });

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

  const server = app.listen(port, () => {
    console.error(`OpenRouter proxy listening on :${port}`);
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`OpenRouter proxy port ${port} already in use, skipping new listener`);
      return;
    }

    throw error;
  });

  return server;
};
