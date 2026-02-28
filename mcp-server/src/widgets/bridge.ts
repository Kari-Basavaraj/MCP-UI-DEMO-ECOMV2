/**
 * Bridge for widget ↔ chat host communication.
 *
 * Sends UIActionResult-formatted postMessages to the parent frame.
 * UIResourceRenderer (from @mcp-ui/client) receives these in its catch-all
 * handler and forwards them to the onUIAction callback in tool-invocation.tsx.
 *
 * This replaces the ext-apps SDK's callServerTool() which uses JSON-RPC
 * messages that UIResourceRenderer doesn't understand.
 */

/** Fire a tool call through the chat (LLM will execute it and show a new widget) */
export function callTool(toolName: string, params: Record<string, any> = {}): void {
  window.parent.postMessage(
    { type: "tool", payload: { toolName, params } },
    "*"
  );
}

/** Send a natural-language prompt through the chat */
export function sendPrompt(prompt: string): void {
  window.parent.postMessage(
    { type: "prompt", payload: { prompt } },
    "*"
  );
}

/** Open an external link */
export function openLink(url: string): void {
  window.parent.postMessage(
    { type: "link", payload: { url } },
    "*"
  );
}

/* ── Auto-resize: tell the host iframe our content size ─── */

/** Post current content dimensions to the parent so the iframe resizes. */
function postSize(): void {
  const body = document.body;
  // Measure content bounds only. Including viewport-bound values like
  // clientHeight/clientWidth can lock iframe size and prevent shrinking.
  const bodyRect = body.getBoundingClientRect();

  let deepestBottom = bodyRect.top;
  let widestRight = bodyRect.left;
  const children = body.children;
  for (let i = 0; i < children.length; i += 1) {
    const rect = children[i].getBoundingClientRect();
    if (rect.bottom > deepestBottom) deepestBottom = rect.bottom;
    if (rect.right > widestRight) widestRight = rect.right;
  }

  const contentHeightFromRects = Math.max(0, deepestBottom - bodyRect.top);
  const contentWidthFromRects = Math.max(0, widestRight - bodyRect.left);

  const height = Math.ceil(
    Math.max(body.scrollHeight, body.offsetHeight, contentHeightFromRects)
  );
  const width = Math.ceil(
    Math.max(body.scrollWidth, body.offsetWidth, contentWidthFromRects)
  );

  // Keep a practical floor to avoid accidental zero-height collapse while loading.
  const clampedHeight = Math.max(120, height);
  const clampedWidth = Math.max(1, width);
  window.parent.postMessage(
    { type: "ui-size-change", payload: { width: clampedWidth, height: clampedHeight } },
    "*"
  );
}

/** Observe content size changes and auto-report to the parent frame. */
export function enableAutoResize(): void {
  // Initial size report after first paint
  requestAnimationFrame(() => {
    postSize();
    // Second pass after images/fonts settle
    setTimeout(postSize, 200);
  });

  // Watch for DOM mutations & resizes
  const ro = new ResizeObserver(() => postSize());
  ro.observe(document.body);

  const mo = new MutationObserver(() => requestAnimationFrame(postSize));
  mo.observe(document.body, { childList: true, subtree: true, attributes: true });

  // Re-report on image load
  document.addEventListener("load", (e) => {
    if ((e.target as HTMLElement)?.tagName === "IMG") postSize();
  }, true);
}

// Auto-enable resize when bridge is imported
if (typeof window !== "undefined" && window.parent !== window) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enableAutoResize);
  } else {
    enableAutoResize();
  }
}
