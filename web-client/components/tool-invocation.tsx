"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  CheckCircle2,
  TerminalSquare,
  Code,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UIResourceRenderer } from "@mcp-ui/client";
import type { UseChatHelpers, Message as TMessage } from "@ai-sdk/react";
import { nanoid } from "nanoid";

interface HtmlResourceData {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

interface ContentItem {
  type: string;
  [key: string]: any;
}

interface ParsedResultContainer {
  content: ContentItem[];
}

interface ToolInvocationProps {
  toolName: string;
  state: string;
  args: any;
  result: any;
  isLatestMessage: boolean;
  status: string;
  append?: UseChatHelpers["append"];
}

/* Human-readable status labels for each tool */
const TOOL_STATUS_LABELS: Record<string, { loading: string; done: string }> = {
  get_products: { loading: "Fetching products...", done: "Products loaded" },
  search_products: { loading: "Searching products...", done: "Search complete" },
  filter_products: { loading: "Filtering products...", done: "Products filtered" },
  get_categories: { loading: "Loading categories...", done: "Categories loaded" },
  add_to_cart: { loading: "Adding to cart...", done: "Added to cart" },
  remove_from_cart: { loading: "Removing from cart...", done: "Removed from cart" },
  get_cart: { loading: "Loading cart...", done: "Cart loaded" },
};

function getToolLabel(toolName: string, isRunning: boolean) {
  const labels = TOOL_STATUS_LABELS[toolName];
  if (!labels) return isRunning ? `Running ${toolName}...` : toolName;
  return isRunning ? labels.loading : labels.done;
}

/* Skeleton placeholder while the widget loads */
function WidgetSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border/30 bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 bg-muted/40 rounded" />
        <div className="h-4 w-16 bg-muted/40 rounded" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 bg-muted/40 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="h-24 bg-muted/40 rounded" />
            <div className="h-4 w-24 bg-muted/40 rounded" />
            <div className="h-3 w-16 bg-muted/40 rounded" />
            <div className="flex justify-between items-center mt-2">
              <div className="h-4 w-14 bg-muted/40 rounded" />
              <div className="h-7 w-20 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ToolInvocation = memo(function ToolInvocation({
  toolName,
  state,
  args,
  result,
  isLatestMessage,
  status,
  append,
}: ToolInvocationProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [htmlResourceContents, setHtmlResourceContents] = useState<HtmlResourceData[]>([]);
  const [isLoadingWidget, setIsLoadingWidget] = useState(false);

  const isRunning = state === "call" && isLatestMessage && status !== "ready";
  const hasWidget = htmlResourceContents.length > 0;

  useEffect(() => {
    let processedContainer: ParsedResultContainer | null = null;

    if (result && typeof result === "object" && result.content && Array.isArray(result.content)) {
      processedContainer = result as ParsedResultContainer;
    } else if (typeof result === "string") {
      try {
        const parsed = JSON.parse(result);
        if (parsed?.content && Array.isArray(parsed.content)) {
          processedContainer = parsed as ParsedResultContainer;
        }
      } catch {
        return;
      }
    } else if (result !== null && result !== undefined) {
      return;
    }

    // Check for UI resources from HTTP bridge (HTML stripped, needs fetch)
    const uiResources = (result as any)?._uiResources as Array<{ uri: string; mimeType: string }> | undefined;
    const mcpServerUrl = (result as any)?._mcpServerUrl as string | undefined;

    if (uiResources && uiResources.length > 0 && mcpServerUrl) {
      setIsLoadingWidget(true);
      const fetchResources = async () => {
        const fetched: HtmlResourceData[] = [];
        const textContent = processedContainer?.content?.find(
          (item) => item.type === "text"
        );
        let dataJson: string | undefined;
        if (textContent?.text) {
          try {
            JSON.parse(textContent.text);
            dataJson = textContent.text;
          } catch { /* not JSON, skip */ }
        }

        for (const res of uiResources) {
          try {
            const resp = await fetch(
              `${mcpServerUrl}/api/mcp/resource?uri=${encodeURIComponent(res.uri)}`
            );
            if (resp.ok) {
              let html = await resp.text();
              if (dataJson) {
                html = html.replace(
                  "</head>",
                  `<script>window.__MCP_TOOL_RESULT__=${dataJson};</script></head>`
                );
              }
              const normalizedMime = res.mimeType.startsWith('text/html') ? 'text/html' : res.mimeType;
              fetched.push({ uri: res.uri, mimeType: normalizedMime, text: html });
            }
          } catch (err) {
            console.error("Failed to fetch UI resource:", res.uri, err);
          }
        }
        if (fetched.length > 0) {
          setHtmlResourceContents(fetched);
        }
        setIsLoadingWidget(false);
      };
      fetchResources();
      return;
    }

    // Standard path: resources embedded in content
    if (processedContainer) {
      try {
        const newHtmlResources = processedContainer.content
          .filter(
            (item) =>
              item.type === "resource" &&
              item.resource &&
              item.resource.uri?.startsWith("ui://")
          )
          .map((item) => {
            const rawMime = item.resource.mimeType || '';
            const normalizedMime = rawMime.startsWith('text/html') ? 'text/html' : rawMime;
            return {
              uri: item.resource.uri,
              mimeType: normalizedMime,
              text: item.resource._html || item.resource.text,
            } as HtmlResourceData;
          });

        setHtmlResourceContents((prevContents) => {
          const newUris = newHtmlResources.map((r) => r.uri).sort();
          const currentUris = prevContents.map((r) => r.uri).sort();
          if (JSON.stringify(newUris) !== JSON.stringify(currentUris)) {
            return newHtmlResources;
          }
          return prevContents;
        });
      } catch {
        /* ignore */
      }
    }
  }, [result]);

  const handleUiAction = useCallback(
    async (actionResult: any) => {
      if (append) {
        let userMessageContent = "";
        if (actionResult.type === "tool") {
          userMessageContent = `Call ${actionResult.payload.toolName} with parameters: ${JSON.stringify(actionResult.payload.params)}`;
        }
        if (actionResult.type === "prompt") {
          userMessageContent = actionResult.payload.prompt;
        }
        if (userMessageContent) {
          const newMessage: TMessage = {
            id: nanoid(),
            role: "user",
            content: userMessageContent,
          };
          append(newMessage);
        }
        return Promise.resolve({ status: "ok", message: "Action requested" });
      }
      return Promise.resolve({ status: "error", message: "No chat context" });
    },
    [append]
  );

  const resourceStyle = { minHeight: 425 };

  const renderedHtmlResources = useMemo(() => {
    return htmlResourceContents.map((resourceData, index) => (
      <UIResourceRenderer
        key={resourceData.uri || `html-resource-${index}`}
        resource={resourceData as any}
        htmlProps={{ style: resourceStyle }}
        onUIAction={handleUiAction}
      />
    ));
  }, [htmlResourceContents, handleUiAction]);

  const formatContent = (content: any): string => {
    try {
      if (typeof content === "string") {
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      }
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  // ---- WIDGET-FIRST RENDERING ----

  // If tool is still running (no result yet), show the thinking indicator
  if (isRunning && !result) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <Loader2 className="animate-spin h-4 w-4 text-primary/70" />
          <span className="text-sm text-muted-foreground animate-pulse">
            {getToolLabel(toolName, true)}
          </span>
        </div>
        <WidgetSkeleton />
      </div>
    );
  }

  // Widget is being fetched (result came back but HTML not loaded yet)
  if (isLoadingWidget) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <Loader2 className="animate-spin h-4 w-4 text-primary/70" />
          <span className="text-sm text-muted-foreground animate-pulse">
            Loading widget...
          </span>
        </div>
        <WidgetSkeleton />
      </div>
    );
  }

  // Has a widget to show — render it prominently (no chrome)
  if (hasWidget) {
    return (
      <div className="mb-2 space-y-1">
        {renderedHtmlResources}
        {/* Small debug toggle for developers */}
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors px-1"
        >
          <TerminalSquare className="h-2.5 w-2.5" />
          <span>{toolName}</span>
          {showDebug ? <ChevronUpIcon className="h-2.5 w-2.5" /> : <ChevronDownIcon className="h-2.5 w-2.5" />}
        </button>
        {showDebug && (
          <div className="rounded-md border border-border/30 bg-muted/10 p-2 space-y-1.5">
            {!!args && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Code className="h-2.5 w-2.5" />
                  <span>Arguments</span>
                </div>
                <pre className="text-[10px] font-mono p-1.5 rounded bg-muted/10 overflow-x-auto">
                  {formatContent(args)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // No widget — fallback to a compact tool result view (non-UI tools like get_categories)
  return (
    <div
      className={cn(
        "flex flex-col mb-2 rounded-lg border border-border/30 overflow-hidden",
        "bg-muted/10 transition-all duration-200"
      )}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setShowDebug(!showDebug)}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
          {isRunning ? (
            <Loader2 className="animate-spin h-3 w-3 text-primary/70" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-primary/70" />
          )}
          <span className="text-muted-foreground/70">{getToolLabel(toolName, isRunning)}</span>
        </div>
        <div className="opacity-50 hover:opacity-100 transition-opacity">
          {showDebug ? (
            <ChevronUpIcon className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {showDebug && result && (
        <div className="space-y-1.5 px-3 pb-2 border-t border-border/20">
          {!!args && (
            <div className="space-y-1 pt-1.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Code className="h-2.5 w-2.5" />
                <span>Arguments</span>
              </div>
              <pre className="text-[10px] font-mono p-1.5 rounded bg-muted/10 overflow-x-auto">
                {formatContent(args)}
              </pre>
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <ArrowRight className="h-2.5 w-2.5" />
              <span>Result</span>
            </div>
            <pre className="text-[10px] font-mono p-1.5 rounded bg-muted/10 overflow-x-auto max-h-[200px] overflow-y-auto">
              {formatContent(result)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});
