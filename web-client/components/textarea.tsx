"use client";

import type { ModelInfo } from "@/ai/providers";
import { ArrowUpIcon, StopCircleIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useMemo } from "react";

export function Textarea({
  selectedModel,
  setSelectedModel,
  handleInputChange,
  input,
  isLoading,
  status,
  stop,
  models = [],
  modelDetails = {},
}: {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  input: string;
  isLoading: boolean;
  status: string;
  stop: () => void;
  models?: string[];
  modelDetails?: Record<string, ModelInfo>;
}) {
  const [showModels, setShowModels] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModels(false);
        setModelSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showModels && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showModels]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Filter & group models by provider
  const filteredModels = useMemo(() => {
    const q = modelSearch.toLowerCase();
    return models.filter((m) => {
      if (!q) return true;
      const detail = modelDetails[m];
      return (
        m.toLowerCase().includes(q) ||
        (detail?.name || "").toLowerCase().includes(q) ||
        (detail?.provider || "").toLowerCase().includes(q)
      );
    });
  }, [models, modelDetails, modelSearch]);

  // Group filtered models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const m of filteredModels) {
      const provider = modelDetails[m]?.provider || m.split("/")[0] || "Other";
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(m);
    }
    return groups;
  }, [filteredModels, modelDetails]);

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-border/60 bg-secondary/50 backdrop-blur-sm focus-within:border-primary/40 transition-colors">
      <textarea
        ref={textareaRef}
        className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        placeholder="Send a message..."
        rows={1}
        value={input}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              e.currentTarget.form?.requestSubmit();
            }
          }
        }}
      />

      <div className="flex items-center justify-between px-3 pb-2">
        {/* Model selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowModels(!showModels)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span>{modelDetails[selectedModel]?.name || selectedModel}</span>
            <ChevronDownIcon className="h-3 w-3" />
          </button>

          {showModels && (
            <div className="absolute bottom-full left-0 mb-1 w-80 rounded-lg border border-border bg-background shadow-xl z-50 flex flex-col max-h-[400px]">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                <SearchIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                {modelSearch && (
                  <button
                    type="button"
                    onClick={() => setModelSearch("")}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable model list */}
              <div className="overflow-y-auto flex-1 py-1">
                {Object.keys(groupedModels).length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No models match "{modelSearch}"
                  </div>
                )}
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm">
                      {provider} <span className="font-normal">({providerModels.length})</span>
                    </div>
                    {providerModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m);
                          setShowModels(false);
                          setModelSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors",
                          m === selectedModel ? "text-primary bg-muted/30" : "text-foreground"
                        )}
                      >
                        <div className="font-medium truncate">{modelDetails[m]?.name || m}</div>
                        {modelDetails[m]?.contextLength && (
                          <span className="text-muted-foreground text-[10px]">
                            {Math.round(modelDetails[m].contextLength! / 1000)}K ctx
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer with count */}
              <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
                {filteredModels.length} of {models.length} models
              </div>
            </div>
          )}
        </div>

        {/* Send / Stop button */}
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-full p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <StopCircleIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
