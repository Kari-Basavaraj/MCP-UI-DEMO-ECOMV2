"use client";

import { useState } from "react";
import { useMCP, type MCPServer } from "@/lib/context/mcp-context";
import {
  X,
  Globe,
  RefreshCw,
  Trash2,
  Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

export function MCPServerConfig({ onClose }: { onClose: () => void }) {
  const {
    mcpServers,
    setMcpServers,
    selectedMcpServers,
    setSelectedMcpServers,
    startServer,
    stopServer,
  } = useMCP();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const server: MCPServer = {
      id: nanoid(),
      name: newName.trim(),
      url: newUrl.trim(),
      type: "sse",
      status: "disconnected",
    };
    setMcpServers([...mcpServers, server]);
    setNewName("");
    setNewUrl("");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setMcpServers(mcpServers.filter((s) => s.id !== id));
    setSelectedMcpServers(selectedMcpServers.filter((sid) => sid !== id));
  };

  const handleToggle = async (server: MCPServer) => {
    if (server.status === "connected") {
      await stopServer(server.id);
      setSelectedMcpServers(selectedMcpServers.filter((id) => id !== server.id));
    } else {
      const ok = await startServer(server.id);
      if (ok) {
        setSelectedMcpServers([...selectedMcpServers, server.id]);
      }
    }
  };

  const handleDisableAll = () => {
    mcpServers.forEach((s) => stopServer(s.id));
    setSelectedMcpServers([]);
  };

  const formatCheckTime = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" />
                <line x1="6" x2="6.01" y1="18" y2="18" />
              </svg>
              <h2 className="text-lg font-semibold">MCP Server Configuration</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connect to Model Context Protocol servers to access additional AI tools.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {!isAdding ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Available Servers</div>
                <div className="text-xs text-muted-foreground">
                  Select multiple servers to combine their tools
                </div>
              </div>

              {mcpServers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No MCP servers configured. Add one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {mcpServers.map((server) => (
                    <div
                      key={server.id}
                      className="rounded-lg border border-border/60 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{server.name}</span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium border border-primary/30 text-primary bg-primary/5">
                            SSE
                          </span>
                          {server.status === "connected" && (
                            <span className="flex items-center gap-1 text-[10px] text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Connected
                            </span>
                          )}
                          {server.status === "connecting" && (
                            <span className="text-[10px] text-yellow-400">
                              Connecting...
                            </span>
                          )}
                          {server.status === "error" && (
                            <span className="text-[10px] text-destructive">Error</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggle(server)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title={
                              server.status === "connected" ? "Disconnect" : "Connect"
                            }
                          >
                            <Power
                              className={cn(
                                "h-3.5 w-3.5",
                                server.status === "connected"
                                  ? "text-green-400"
                                  : "text-muted-foreground"
                              )}
                            />
                          </button>
                          <button
                            onClick={async () => {
                              const ok = await startServer(server.id);
                              if (ok && !selectedMcpServers.includes(server.id)) {
                                setSelectedMcpServers([...selectedMcpServers, server.id]);
                              }
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Reconnect"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(server.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 truncate">
                        {server.url}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {server.lastCheckAt ? (
                          <>
                            Last check: {formatCheckTime(server.lastCheckAt)}
                            {typeof server.lastCheckLatencyMs === "number" ? ` · ${server.lastCheckLatencyMs}ms` : ""}
                          </>
                        ) : (
                          <>Last check: never</>
                        )}
                      </div>
                      {server.status === "error" && server.errorMessage && (
                        <div className="text-[10px] text-destructive mt-1 break-words">
                          {server.errorMessage}
                        </div>
                      )}
                      {server.status !== "connected" && (
                        <button
                          onClick={() => handleToggle(server)}
                          className="w-full mt-2 rounded-md py-1.5 text-xs font-medium bg-secondary hover:bg-muted border border-border/50 transition-colors"
                        >
                          Enable Server
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Add server form */
            <div className="space-y-4">
              <div className="text-sm font-medium">Add New MCP Server</div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Server Name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My MCP Server"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Transport Type
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Choose how to connect to your MCP server:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-primary bg-primary/5 p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">SSE</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Server-Sent Events
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border/30 p-3 text-left opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">&gt;_</span>
                      <span className="text-sm font-medium">stdio</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Standard I/O
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Server URL
                </label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="http://localhost:8787/sse"
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Full URL to the SSE endpoint of the MCP server
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          {!isAdding ? (
            <>
              <button
                onClick={handleDisableAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Disable All
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                <span>⊕</span> Add Server
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || !newUrl.trim()}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  newName.trim() && newUrl.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Add Server
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
