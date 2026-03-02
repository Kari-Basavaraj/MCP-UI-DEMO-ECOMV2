"use client";

import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export interface KeyValuePair {
  key: string;
  value: string;
}

export type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  type: 'sse';
  headers?: KeyValuePair[];
  status?: ServerStatus;
  errorMessage?: string;
  lastCheckAt?: string;
  lastSuccessfulCheckAt?: string;
  lastCheckLatencyMs?: number;
}

export interface MCPServerApi {
  type: 'sse';
  url: string;
  headers?: KeyValuePair[];
}

interface MCPContextType {
  mcpServers: MCPServer[];
  setMcpServers: (servers: MCPServer[] | ((prev: MCPServer[]) => MCPServer[])) => void;
  selectedMcpServers: string[];
  setSelectedMcpServers: (ids: string[] | ((prev: string[]) => string[])) => void;
  mcpServersForApi: MCPServerApi[];
  startServer: (id: string) => Promise<boolean>;
  stopServer: (id: string) => Promise<boolean>;
  updateServerStatus: (
    id: string,
    status: ServerStatus,
    error?: string,
    meta?: Pick<MCPServer, 'lastCheckAt' | 'lastSuccessfulCheckAt' | 'lastCheckLatencyMs'>
  ) => void;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

// Detect production environment (Vercel or non-localhost hostname)
function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
}

function getDefaultServer(): MCPServer {
  if (isProduction()) {
    // Production: same-origin embedded MCP server
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      id: 'ecommerce-cloud',
      name: 'Ecommerce MCP (Cloud)',
      url: `${origin}/sse`,
      type: 'sse',
      status: 'disconnected',
    };
  }
  // Local dev: standalone MCP server on port 8787
  return {
    id: 'ecommerce-local',
    name: 'Ecommerce MCP (Local)',
    url: 'http://localhost:8787/sse',
    type: 'sse',
    status: 'disconnected',
  };
}

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [mcpServers, setMcpServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [selectedMcpServers, setSelectedMcpServers] = useLocalStorage<string[]>('selected-mcp-servers', []);
  const activeRef = useRef<Record<string, boolean>>({});
  const [didAutoConnect, setDidAutoConnect] = useState(false);
  const [didMigrate, setDidMigrate] = useState(false);

  const updateServerStatus = useCallback((
    id: string,
    status: ServerStatus,
    error?: string,
    meta: Pick<MCPServer, 'lastCheckAt' | 'lastSuccessfulCheckAt' | 'lastCheckLatencyMs'> = {}
  ) => {
    setMcpServers((servers: MCPServer[]) =>
      servers.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          status,
          errorMessage: error,
          ...meta,
        };
      })
    );
  }, [setMcpServers]);

  const getBaseUrl = (sseUrl: string) => sseUrl.replace(/\/sse\/?$/, "");

  const probeServer = useCallback(async (server: MCPServer) => {
    const headers: Record<string, string> = {};
    if (server.headers) {
      for (const h of server.headers) {
        if (h.key) headers[h.key] = h.value || "";
      }
    }
    const baseUrl = getBaseUrl(server.url);
    const retries = [0, 300, 900];
    let lastError = "Unknown connection failure";

    for (const delayMs of retries) {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const startedAt = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const healthRes = await fetch(`${baseUrl}/api/health`, { headers, signal: controller.signal });
        if (!healthRes.ok) {
          clearTimeout(timeout);
          throw new Error(`Health check failed (${healthRes.status})`);
        }

        const toolsRes = await fetch(`${baseUrl}/api/mcp/tools`, { headers, signal: controller.signal });
        clearTimeout(timeout);
        if (!toolsRes.ok) {
          throw new Error(`Tool probe failed (${toolsRes.status})`);
        }
        const body = await toolsRes.json();
        if (!Array.isArray(body.tools)) {
          throw new Error("Tool probe returned invalid response");
        }

        return {
          ok: true,
          latencyMs: Date.now() - startedAt,
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Connection probe failed";
      }
    }

    return { ok: false, error: lastError };
  }, []);

  const startServer = useCallback(async (id: string): Promise<boolean> => {
    const server = mcpServers.find(s => s.id === id);
    if (!server) return false;

    updateServerStatus(id, 'connecting');

    try {      
      const probe = await probeServer(server);
      if (!probe.ok) {
        updateServerStatus(id, 'error', probe.error || 'Connection failed');
        return false;
      }

      updateServerStatus(id, 'connected', undefined, {
        lastCheckAt: probe.checkedAt,
        lastSuccessfulCheckAt: probe.checkedAt,
        lastCheckLatencyMs: probe.latencyMs,
      });
      activeRef.current[id] = true;
      return true;
    } catch (error) {
      updateServerStatus(id, 'error', error instanceof Error ? error.message : 'Connection failed');
      return false;
    }
  }, [mcpServers, probeServer, updateServerStatus]);

  const stopServer = useCallback(async (id: string): Promise<boolean> => {
    updateServerStatus(id, 'disconnected');
    delete activeRef.current[id];
    return true;
  }, [updateServerStatus]);

  const mcpServersForApi: MCPServerApi[] = selectedMcpServers
    .map(id => mcpServers.find(s => s.id === id))
    .filter((s): s is MCPServer => !!s && s.status === 'connected')
    .map(s => ({ type: 'sse' as const, url: s.url, headers: s.headers }));

  // ---- Server migration & auto-connect ----
  // On mount: ensure the correct default server exists for the current environment.
  // Remove stale servers from the wrong environment (e.g. localhost on prod).
  useEffect(() => {
    if (didMigrate) return;
    setDidMigrate(true);

    const isProd = isProduction();
    const correctDefault = getDefaultServer();
    const correctId = correctDefault.id;
    const staleId = isProd ? 'ecommerce-local' : 'ecommerce-cloud';

    setMcpServers(prev => {
      // Remove any stale server from the OTHER environment
      let cleaned = prev.filter(s => s.id !== staleId);
      // Also remove any server pointing to localhost in production
      if (isProd) {
        cleaned = cleaned.filter(s => !s.url.includes('localhost'));
      }
      // Ensure the correct default server exists
      const hasCorrect = cleaned.some(s => s.id === correctId);
      if (!hasCorrect) {
        cleaned = [correctDefault, ...cleaned];
      }
      return cleaned;
    });

    // Also clean stale selections
    setSelectedMcpServers(prev => prev.filter(id => id !== staleId));
  }, [didMigrate, setMcpServers, setSelectedMcpServers]);

  // Auto-connect the default server after migration
  useEffect(() => {
    if (!didMigrate || didAutoConnect) return;

    const defaultId = isProduction() ? 'ecommerce-cloud' : 'ecommerce-local';
    const defaultSrv = mcpServers.find(s => s.id === defaultId);
    if (!defaultSrv) return;

    if (defaultSrv.status !== 'connected' && !activeRef.current[defaultSrv.id]) {
      setDidAutoConnect(true);
      startServer(defaultSrv.id).then(ok => {
        if (ok) {
          setSelectedMcpServers(prev => prev.includes(defaultSrv.id) ? prev : [...prev, defaultSrv.id]);
        }
      });
    }
  }, [mcpServers, didMigrate, didAutoConnect, startServer, setSelectedMcpServers]);

  return (
    <MCPContext.Provider value={{
      mcpServers, setMcpServers,
      selectedMcpServers, setSelectedMcpServers,
      mcpServersForApi,
      startServer, stopServer, updateServerStatus,
    }}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const ctx = useContext(MCPContext);
  if (!ctx) throw new Error('useMCP must be used within MCPProvider');
  return ctx;
}
