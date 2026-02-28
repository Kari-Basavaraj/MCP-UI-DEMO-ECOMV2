"use client";

import { useEffect, useState, useMemo, useCallback, memo, useRef } from "react";
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
import { useTheme } from "@/lib/context/theme-context";
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

const RESIZE_RUNTIME_MARKER = "mcp-ui-resize-runtime-v1";

function injectWidgetRuntime(html: string, theme: string, dataJson?: string): string {
  if (!html || html.includes(RESIZE_RUNTIME_MARKER)) return html;

  const dataSnippet = dataJson ? `window.__MCP_TOOL_RESULT__=${dataJson};` : "";
  const runtimeScript = `
<script id="${RESIZE_RUNTIME_MARKER}">
(() => {
  ${dataSnippet}
  const sendSize = () => {
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.ceil(Math.max(
      doc?.scrollWidth ?? 0,
      body?.scrollWidth ?? 0,
      doc?.offsetWidth ?? 0,
      body?.offsetWidth ?? 0
    ));
    const height = Math.ceil(Math.max(
      doc?.scrollHeight ?? 0,
      body?.scrollHeight ?? 0,
      doc?.offsetHeight ?? 0,
      body?.offsetHeight ?? 0
    ));
    window.parent?.postMessage({ type: "ui-size-change", payload: { width, height } }, "*");
  };

  let rafId = 0;
  const scheduleSize = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      sendSize();
    });
  };

  document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "theme-change") {
      document.documentElement.setAttribute("data-theme", e.data.theme);
      scheduleSize();
    }
  });

  const mutationObserver = new MutationObserver(scheduleSize);
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  const resizeObserver = new ResizeObserver(scheduleSize);
  resizeObserver.observe(document.documentElement);
  if (document.body) resizeObserver.observe(document.body);

  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement) scheduleSize();
  }, true);

  window.addEventListener("load", scheduleSize);
  window.addEventListener("resize", scheduleSize);
  document.addEventListener("DOMContentLoaded", scheduleSize);

  setTimeout(scheduleSize, 0);
  setTimeout(scheduleSize, 150);
  setTimeout(scheduleSize, 600);
})();
</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${runtimeScript}</head>`);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${runtimeScript}</body>`);
  }
  return `${html}${runtimeScript}`;
}

/* Tools that produce UI widgets */
const WIDGET_TOOLS = new Set([
  "get_products", "search_products", "filter_products",
  "get_product_detail", "get_price_info", "get_categories",
  "get_cart", "get_cart_summary", "add_to_cart", "remove_from_cart",
  "checkout", "place_order", "get_reviews",
  "get_wishlist", "add_to_wishlist", "remove_from_wishlist",
]);

/* Human-readable status labels for each tool */
const TOOL_STATUS_LABELS: Record<string, { loading: string; done: string }> = {
  get_products: { loading: "Fetching products...", done: "Products loaded" },
  search_products: { loading: "Searching products...", done: "Search complete" },
  filter_products: { loading: "Filtering products...", done: "Products filtered" },
  get_product_detail: { loading: "Loading product details...", done: "Product details loaded" },
  get_price_info: { loading: "Checking price...", done: "Price loaded" },
  get_categories: { loading: "Loading categories...", done: "Categories loaded" },
  get_cart: { loading: "Loading cart...", done: "Cart loaded" },
  get_cart_summary: { loading: "Loading cart summary...", done: "Cart summary loaded" },
  add_to_cart: { loading: "Adding to cart...", done: "Added to cart" },
  remove_from_cart: { loading: "Removing from cart...", done: "Removed from cart" },
  checkout: { loading: "Loading checkout...", done: "Checkout ready" },
  place_order: { loading: "Placing order...", done: "Order placed" },
  get_reviews: { loading: "Loading reviews...", done: "Reviews loaded" },
  get_wishlist: { loading: "Loading wishlist...", done: "Wishlist loaded" },
  add_to_wishlist: { loading: "Adding to wishlist...", done: "Added to wishlist" },
  remove_from_wishlist: { loading: "Removing from wishlist...", done: "Removed from wishlist" },
};

/* Map tool actions to natural language messages for the LLM */
const ACTION_TO_NATURAL_LANGUAGE: Record<string, (params: any) => string> = {
  add_to_cart: (p) => `Add ${p.quantity ? p.quantity + " of " : ""}product ${p.productId} to my cart`,
  remove_from_cart: (p) => `Remove product ${p.productId} from my cart`,
  get_cart: () => "Show me my cart",
  get_cart_summary: () => "Show me my cart summary",
  get_products: () => "Show me the products",
  search_products: (p) => `Search for "${p.query}"`,
  filter_products: (p) => `Show me products in the ${p.category} category`,
  get_product_detail: (p) => `Show me details for product ${p.productId}`,
  get_price_info: (p) => `What's the price of product ${p.productId}?`,
  get_categories: () => "Show me the product categories",
  checkout: () => "I'd like to checkout",
  place_order: (p) => `Place my order${p.shippingAddress ? " to " + p.shippingAddress : ""}`,
  get_reviews: (p) => `Show me reviews for product ${p.productId}`,
  get_wishlist: () => "Show me my wishlist",
  add_to_wishlist: (p) => `Add product ${p.productId} to my wishlist`,
  remove_from_wishlist: (p) => `Remove product ${p.productId} from my wishlist`,
};

/* Contextual follow-up suggestions shown after a widget renders */
const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = {
  get_products: ["Filter by Footwear", "Search for watches", "Show today's deals"],
  get_categories: ["Show all products", "Filter by Footwear", "Search for a product"],
  search_products: ["Browse all products", "View my cart", "Show my wishlist"],
  filter_products: ["Show all products", "Search for something else", "View my cart"],
  get_product_detail: ["Add this to my cart", "Show me reviews", "Check the price"],
  get_price_info: ["Show me the full details", "Add to cart", "Compare with other products"],
  get_cart: ["Proceed to checkout", "Continue shopping", "View my wishlist"],
  get_cart_summary: ["Go to checkout", "View full cart", "Browse more products"],
  add_to_cart: ["View my cart", "Continue shopping", "Proceed to checkout"],
  remove_from_cart: ["View my cart", "Browse products", "Check my wishlist"],
  checkout: ["Place my order", "Go back to cart", "Continue shopping"],
  place_order: ["Browse more products", "View my wishlist", "Show all products"],
  get_reviews: ["Show me product details", "Add to cart", "Browse similar products"],
  get_wishlist: ["Move an item to cart", "Browse more products", "View my cart"],
  add_to_wishlist: ["View my wishlist", "Continue shopping", "View my cart"],
  remove_from_wishlist: ["View my wishlist", "Browse products", "View my cart"],
};

function getToolLabel(toolName: string, isRunning: boolean) {
  const labels = TOOL_STATUS_LABELS[toolName];
  if (!labels) return isRunning ? `Running ${toolName}...` : toolName;
  return isRunning ? labels.loading : labels.done;
}

/* Follow-up suggestion chips */
function FollowUpChips({ toolName, append }: { toolName: string; append?: UseChatHelpers["append"] }) {
  const suggestions = FOLLOW_UP_SUGGESTIONS[toolName];
  if (!suggestions || !append) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 animate-widget-appear" style={{ animationDelay: "0.15s" }}>
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() =>
            append({ id: nanoid(), role: "user", content: label })
          }
          className="group inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-150 cursor-pointer"
        >
          {label}
          <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}

/* Skeleton placeholder — adapts shape to tool type, uses CSS classes for visibility */
function WidgetSkeleton({ toolName }: { toolName?: string }) {
  const bar = "skeleton-shimmer rounded-md"; // shimmer bar
  const block = "skeleton-block"; // static block

  // Product grid skeleton
  if (toolName === "get_products" || toolName === "search_products" || toolName === "filter_products") {
    return (
      <div className="skeleton-container space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-28 ${bar}`} />
          <div className={`h-4 w-16 ${bar}`} />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-7 w-20 ${bar} !rounded-full`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${block} !rounded-lg p-3 space-y-2 !bg-transparent border border-border`}>
              <div className={`h-24 ${bar}`} />
              <div className={`h-4 w-24 ${bar}`} />
              <div className={`h-3 w-16 ${bar}`} />
              <div className="flex justify-between items-center mt-2">
                <div className={`h-4 w-14 ${bar}`} />
                <div className={`h-7 w-20 ${bar}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Product detail skeleton
  if (toolName === "get_product_detail") {
    return (
      <div className="skeleton-container flex gap-4">
        <div className={`w-1/2 h-56 ${bar}`} />
        <div className="w-1/2 space-y-3 py-2">
          <div className={`h-3 w-16 ${bar}`} />
          <div className={`h-6 w-40 ${bar}`} />
          <div className={`h-5 w-24 ${bar}`} />
          <div className={`h-3 w-full ${bar}`} />
          <div className={`h-3 w-3/4 ${bar}`} />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-10 w-10 ${bar}`} />
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <div className={`h-10 flex-1 ${bar}`} />
            <div className={`h-10 w-24 ${bar}`} />
          </div>
        </div>
      </div>
    );
  }

  // Cart skeleton
  if (toolName?.includes("cart")) {
    return (
      <div className="skeleton-container space-y-3">
        <div className={`h-5 w-32 ${bar}`} />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
            <div className={`h-14 w-14 ${bar} shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-32 ${bar}`} />
              <div className={`h-3 w-20 ${bar}`} />
            </div>
            <div className={`h-4 w-16 ${bar}`} />
          </div>
        ))}
        <div className={`h-10 w-full ${bar} mt-2`} />
      </div>
    );
  }

  // Checkout / order skeleton
  if (toolName === "checkout" || toolName === "place_order") {
    return (
      <div className="skeleton-container space-y-4">
        <div className={`h-6 w-28 ${bar}`} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className={`h-3 w-16 ${bar}`} />
              <div className={`h-10 w-full ${bar}`} />
            </div>
          ))}
        </div>
        <div className={`h-10 w-full ${bar}`} />
      </div>
    );
  }

  // Review skeleton
  if (toolName === "get_reviews") {
    return (
      <div className="skeleton-container space-y-4">
        <div className={`h-5 w-36 ${bar}`} />
        <div className="flex gap-4 p-3 rounded-lg border border-border">
          <div className="space-y-1 items-center flex flex-col">
            <div className={`h-8 w-12 ${bar}`} />
            <div className={`h-3 w-20 ${bar}`} />
          </div>
          <div className="flex-1 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-2 w-6 ${bar}`} />
                <div className={`h-2 flex-1 ${bar} !rounded-full`} />
              </div>
            ))}
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-border space-y-2">
            <div className={`h-4 w-24 ${bar}`} />
            <div className={`h-3 w-full ${bar}`} />
            <div className={`h-3 w-2/3 ${bar}`} />
          </div>
        ))}
      </div>
    );
  }

  // Price tag skeleton
  if (toolName === "get_price_info") {
    return (
      <div className="skeleton-container space-y-3 max-w-xs">
        <div className={`h-5 w-32 ${bar}`} />
        <div className="flex gap-2">
          <div className={`h-6 w-16 ${bar} !rounded-full`} />
          <div className={`h-6 w-16 ${bar} !rounded-full`} />
        </div>
        <div className={`h-8 w-28 ${bar}`} />
        <div className={`h-3 w-full ${bar}`} />
      </div>
    );
  }

  // Wishlist skeleton
  if (toolName?.includes("wishlist")) {
    return (
      <div className="skeleton-container space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-5 w-28 ${bar}`} />
          <div className={`h-5 w-8 ${bar} !rounded-full`} />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-40 rounded-lg border border-border overflow-hidden">
              <div className={`h-32 ${bar} !rounded-none`} />
              <div className="p-2 space-y-1">
                <div className={`h-3 w-20 ${bar}`} />
                <div className={`h-4 w-16 ${bar}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generic fallback skeleton
  return (
    <div className="skeleton-container space-y-4">
      <div className="flex items-center justify-between">
        <div className={`h-5 w-28 ${bar}`} />
        <div className={`h-4 w-16 ${bar}`} />
      </div>
      <div className="space-y-2">
        <div className={`h-4 w-full ${bar}`} />
        <div className={`h-4 w-3/4 ${bar}`} />
        <div className={`h-4 w-1/2 ${bar}`} />
      </div>
      <div className={`h-10 w-full ${bar}`} />
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
  const [fetchFailed, setFetchFailed] = useState(false);
  const widgetScopeRef = useRef<HTMLDivElement | null>(null);
  const skeletonMinRef = useRef<number>(0);
  const { theme } = useTheme();

  // Prevent duplicate resource fetches when result reference changes during streaming
  const fetchedUrisRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const isRunning = state === "call" && isLatestMessage && status !== "ready";
  const hasWidget = htmlResourceContents.length > 0;

  useEffect(() => {
    if (!result) return;

    let processedContainer: ParsedResultContainer | null = null;

    if (typeof result === "object" && result.content && Array.isArray(result.content)) {
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
    } else {
      return;
    }

    // Check for UI resources from HTTP bridge (HTML stripped, needs fetch)
    const uiResources = (result as any)?._uiResources as Array<{ uri: string; mimeType: string }> | undefined;
    const mcpServerUrl = (result as any)?._mcpServerUrl as string | undefined;

    if (uiResources && uiResources.length > 0 && mcpServerUrl) {
      // Dedup: skip if we already fetched these exact URIs
      const uriKey = uiResources.map(r => r.uri).sort().join("|");
      if (fetchedUrisRef.current === uriKey) return;

      // Abort any previous in-flight fetch
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoadingWidget(true);
      skeletonMinRef.current = Date.now();

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
          if (controller.signal.aborted) return;
          try {
            const resp = await fetch(
              `${mcpServerUrl}/api/mcp/resource?uri=${encodeURIComponent(res.uri)}`,
              { signal: controller.signal }
            );
            if (resp.ok) {
              let html = await resp.text();
              // Inject shared runtime for theme + robust auto-resize signaling.
              html = injectWidgetRuntime(html, theme, dataJson);
              const normalizedMime = res.mimeType.startsWith('text/html') ? 'text/html' : res.mimeType;
              fetched.push({ uri: res.uri, mimeType: normalizedMime, text: html });
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error("Failed to fetch UI resource:", res.uri, err);
          }
        }

        if (controller.signal.aborted) return;

        fetchedUrisRef.current = uriKey;

        // Ensure skeleton is visible for at least 400ms so users see loading feedback
        const elapsed = Date.now() - skeletonMinRef.current;
        const minDelay = Math.max(0, 400 - elapsed);
        await new Promise(r => setTimeout(r, minDelay));

        if (controller.signal.aborted) return;
        if (fetched.length > 0) {
          setHtmlResourceContents(fetched);
        } else {
          setFetchFailed(true);
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
              text: injectWidgetRuntime(item.resource._html || item.resource.text || "", theme),
            } as HtmlResourceData;
          });

        if (newHtmlResources.length > 0) {
          const uriKey = newHtmlResources.map(r => r.uri).sort().join("|");
          if (fetchedUrisRef.current !== uriKey) {
            fetchedUrisRef.current = uriKey;
            setHtmlResourceContents(newHtmlResources);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast theme changes only to iframes rendered by this invocation.
  useEffect(() => {
    if (!hasWidget) return;
    const iframes = widgetScopeRef.current?.querySelectorAll('iframe') ?? [];
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage({ type: 'theme-change', theme }, '*');
      } catch { /* cross-origin, skip */ }
    });
  }, [theme, hasWidget]);

  const handleUiAction = useCallback(
    async (actionResult: any) => {
      if (append) {
        let userMessageContent = "";
        if (actionResult.type === "tool") {
          const { toolName, params } = actionResult.payload;
          // Use natural language so the LLM responds conversationally
          const toNatural = ACTION_TO_NATURAL_LANGUAGE[toolName];
          userMessageContent = toNatural
            ? toNatural(params || {})
            : `Please run ${toolName} with ${JSON.stringify(params)}`;
        }
        if (actionResult.type === "prompt") {
          userMessageContent = actionResult.payload.prompt;
        }
        if (actionResult.type === "intent") {
          const { intent, params } = actionResult.payload;
          userMessageContent = `${intent}${params ? " " + JSON.stringify(params) : ""}`;
        }
        if (actionResult.type === "link") {
          window.open(actionResult.payload.url, "_blank");
          return Promise.resolve({ status: "ok", message: "Link opened" });
        }
        if (actionResult.type === "notify") {
          // Surface notification in the chat
          userMessageContent = actionResult.payload.message;
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

  const resourceStyle = useMemo(
    () => ({
      // Keep a low floor and let autoResizeIframe determine final height.
      minHeight: 220,
      width: "100%",
    }),
    []
  );

  const renderedHtmlResources = useMemo(() => {
    return htmlResourceContents.map((resourceData, index) => (
      <UIResourceRenderer
        key={resourceData.uri || `html-resource-${index}`}
        resource={resourceData as any}
        htmlProps={{
          style: resourceStyle,
          autoResizeIframe: true,
        }}
        onUIAction={handleUiAction}
      />
    ));
  }, [htmlResourceContents, handleUiAction, resourceStyle]);

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

  const isWidgetTool = WIDGET_TOOLS.has(toolName);

  // 1. Widget loaded — always render it first (prevents flicker on re-render)
  if (hasWidget) {
    return (
      <div ref={widgetScopeRef} className="mb-2 space-y-1">
        <div className="rounded-2xl border border-border/40 bg-card shadow-md overflow-hidden animate-widget-appear">
          {renderedHtmlResources}
        </div>
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
        {/* Contextual follow-up suggestions */}
        {isLatestMessage && <FollowUpChips toolName={toolName} append={append} />}
      </div>
    );
  }

  // 2. Loading: tool executing, fetching widget HTML, or result just arrived for a widget tool
  const showLoading = isRunning || isLoadingWidget ||
    (isWidgetTool && result && !hasWidget && !fetchFailed);

  if (showLoading) {
    return (
      <div className="mb-2 animate-widget-appear">
        <div className="flex items-center gap-2 px-1 py-2">
          <Loader2 className="animate-spin h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-muted-foreground shimmer-text">
            {getToolLabel(toolName, true)}
          </span>
        </div>
        {isWidgetTool && <WidgetSkeleton toolName={toolName} />}
      </div>
    );
  }

  // 3. Non-widget tool result — compact collapsible view
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
