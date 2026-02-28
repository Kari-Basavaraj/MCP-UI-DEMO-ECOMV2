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

const DEFAULT_SERVER: MCPServer = {
  id: 'ecommerce-local',
  name: 'Ecommerce MCP',
  url: 'http://localhost:8787/sse',
  type: 'sse',
  status: 'disconnected',
};

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [mcpServers, setMcpServers] = useLocalStorage<MCPServer[]>('mcp-servers', [DEFAULT_SERVER]);
  const [selectedMcpServers, setSelectedMcpServers] = useLocalStorage<string[]>('selected-mcp-servers', []);
  const activeRef = useRef<Record<string, boolean>>({});
  const [didAutoConnect, setDidAutoConnect] = useState(false);

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

  // Auto-connect the default ecommerce server on first visit
  useEffect(() => {
    if (didAutoConnect) return;
    // Ensure default server exists (even if localStorage had an empty array from a previous session)
    const hasDefault = mcpServers.some(s => s.id === 'ecommerce-local');
    if (!hasDefault) {
      setMcpServers(prev => [...prev, DEFAULT_SERVER]);
      return; // Will re-run after state updates
    }
    const defaultSrv = mcpServers.find(s => s.id === 'ecommerce-local');
    if (defaultSrv && defaultSrv.status !== 'connected' && !activeRef.current[defaultSrv.id]) {
      setDidAutoConnect(true);
      startServer(defaultSrv.id).then(ok => {
        if (ok) {
          setSelectedMcpServers(prev => prev.includes(defaultSrv.id) ? prev : [...prev, defaultSrv.id]);
        }
      });
    }
  }, [mcpServers, didAutoConnect, startServer, setSelectedMcpServers, setMcpServers]);

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
