"use client";

import { useState } from "react";
import { useMCP } from "@/lib/context/mcp-context";
import { useTheme } from "@/lib/context/theme-context";
import { Server, PlusCircle, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MCPServerConfig } from "./mcp-server-config";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const { mcpServers } = useMCP();
  const { theme, toggleTheme } = useTheme();

  const connectedCount = mcpServers.filter((s) => s.status === "connected").length;

  return (
    <>
      <aside
        className={cn(
          "h-dvh bg-secondary/30 border-r border-border/40 flex flex-col transition-all duration-200",
          isOpen ? "w-56" : "w-0 overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border/30">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-semibold tracking-tight truncate" title="MCP UI Playground">
            MCP UI Playground
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3">
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Server className="h-4 w-4" />
            <span>MCP Servers</span>
            {connectedCount > 0 && (
              <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {connectedCount}
              </span>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-border/30 p-3 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full rounded-lg px-2 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-4 z-50 rounded p-1.5 text-muted-foreground hover:text-foreground bg-secondary/80 border border-border/30 transition-all",
          isOpen ? "left-[13.25rem]" : "left-3"
        )}
        title="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {showConfig && <MCPServerConfig onClose={() => setShowConfig(false)} />}
    </>
  );
}
