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
  updateServerStatus: (id: string, status: ServerStatus, error?: string) => void;
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

  const updateServerStatus = useCallback((id: string, status: ServerStatus, error?: string) => {
    setMcpServers((servers: MCPServer[]) =>
      servers.map(s => s.id === id ? { ...s, status, errorMessage: error } : s)
    );
  }, [setMcpServers]);

  const startServer = useCallback(async (id: string): Promise<boolean> => {
    const server = mcpServers.find(s => s.id === id);
    if (!server) return false;

    updateServerStatus(id, 'connecting');

    try {
      // For SSE servers, try to probe the endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch(server.url, { signal: controller.signal });
        clearTimeout(timeout);
      } catch {
        clearTimeout(timeout);
        // SSE endpoints may behave differently — assume connected if we can reach the server at all
      }

      updateServerStatus(id, 'connected');
      activeRef.current[id] = true;
      return true;
    } catch (error) {
      updateServerStatus(id, 'error', error instanceof Error ? error.message : 'Connection failed');
      return false;
    }
  }, [mcpServers, updateServerStatus]);

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
