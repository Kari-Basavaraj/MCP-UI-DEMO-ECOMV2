import { fetchOpenRouterModels, getLanguageModel, type modelID } from '@/ai/providers';
import { streamText, type UIMessage } from 'ai';
import { initializeMCPClients, type MCPServerConfig } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const requestId = globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}`;
  let cleanup: () => Promise<void> = async () => {};
  let responseCompleted = false;

  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return Response.json(
        { error: 'Invalid request payload', requestId },
        { status: 400 },
      );
    }

    const {
      messages,
      selectedModel,
      model,
      mcpServers = [],
      userId = "",
    }: {
      messages: UIMessage[];
      selectedModel?: modelID;
      model?: modelID;
      mcpServers?: MCPServerConfig[];
      userId?: string;
    } = payload;

    if (!Array.isArray(messages)) {
      return Response.json(
        { error: 'Invalid payload: messages must be an array', requestId },
        { status: 400 },
      );
    }

    const requestedModel = (selectedModel || model || '').trim();
    let resolvedModel = requestedModel;
    if (!resolvedModel) {
      const { defaultModel } = await fetchOpenRouterModels();
      resolvedModel = defaultModel;
    }
    if (!resolvedModel) {
      return Response.json(
        { error: 'No model selected and no default model is available.', requestId },
        { status: 400 },
      );
    }

    const normalizedMcpServers = Array.isArray(mcpServers) ? mcpServers : [];
    const mcpClient = await initializeMCPClients(normalizedMcpServers, req.signal, userId);
    cleanup = mcpClient.cleanup;

    const result = streamText({
      model: getLanguageModel(resolvedModel),
      system: `You are a friendly e-commerce shopping assistant for an Indian fashion & lifestyle store.
Today is ${new Date().toISOString().split('T')[0]}.

## Product Catalog
You have 8 products across 3 categories:
- **Footwear**: Nike Air Max 90 (id:1, ₹4,999), Ultra Boost Sneakers (id:5, ₹5,999)
- **Clothing**: Classic Crew T-Shirt (id:2, ₹1,999), Urban Bomber Jacket (id:4, ₹3,999), Flex Training Shorts (id:8, ₹1,499)
- **Accessories**: Sport Flex Cap (id:3, ₹999), Chronograph Watch (id:6, ₹2,999), Trail Utility Backpack (id:7, ₹1,999)

## Tool Selection Rules — FOLLOW STRICTLY
Pick the ONE best tool for the user's intent:

| User Intent | Tool to Use | Example |
|---|---|---|
| Browse / see all products | get_products | "show me what you have", "browse products" |
| Search by name/keyword | search_products(query) | "running shoes", "I want a watch", "sport shoes" |
| Filter by category | filter_products(category) | "show me footwear", "only clothing" |
| View one product in detail | get_product_detail(productId) | "tell me about Nike Air Max", "details for id 1" |
| Check price/deal | get_price_info(productId) | "how much is the backpack?", "any deals?" |
| View reviews | get_reviews(productId) | "reviews for sneakers", "what do people think?" |
| Add to cart | add_to_cart(productId) | "add this to my cart", "I'll take it" |
| View cart | get_cart | "show my cart", "what's in my bag?" |
| Cart summary | get_cart_summary | "cart total", "order summary" |
| Remove from cart | remove_from_cart(productId) | "remove the shoes" |
| Checkout | checkout | "checkout", "ready to pay" |
| Place order | place_order({...}) | after checkout form is filled |
| Wishlist | get_wishlist / add_to_wishlist / remove_from_wishlist | "save for later", "my wishlist" |

### Key Decisions:
- When a user asks about a SPECIFIC product by name → use **search_products** first, then offer details
- When a user says a category name (footwear/clothing/accessories) → use **filter_products**
- When a user asks vaguely ("show me stuff", "what do you sell") → use **get_products**
- When a user wants to know price → use **get_price_info** (NOT get_product_detail)
- When following up on a specific product → use **get_product_detail** with the product ID
- To add/remove from cart, you MUST know the productId — infer it from context or ask
- For checkout: first call **checkout** to show the form, then **place_order** after details are provided

## Widget-Triggered Actions
When the user clicks a button inside a widget, it arrives as a natural language message (e.g. "Add product 1 to my cart").
Treat these EXACTLY like a typed message — call the tool immediately, no confirmation needed.
After add_to_cart succeeds, proactively suggest: "View your cart?" or "Continue browsing?"
After checkout tool, the checkout form widget appears — tell the user to fill in their details.
After place_order, the order confirmation widget appears — congratulate them.

## CRITICAL: Response Format After Tool Calls
Tool results render as rich visual widgets — the widget IS your answer.
- After calling a tool, reply with ONLY 1 short sentence (max 10 words). Nothing else.
- GOOD: "Here you go! 👟" / "Added to cart! 🛒" / "Here are the reviews:"
- BAD: Anything longer than 10 words after a tool call
- ABSOLUTELY FORBIDDEN after tool calls:
  • Do NOT mention product names, prices, descriptions, or image URLs
  • Do NOT use markdown: no tables, no bullet lists, no bold, no links
  • Do NOT paste or reference any URL (especially image URLs)
  • Do NOT list or enumerate items the widget already shows
  • Do NOT describe what the widget contains
- The widget speaks for itself — your only job is a brief greeting/acknowledgment
- If you catch yourself writing more than 10 words after a tool call, STOP and delete the excess

## Conversation Style
- Be warm, concise, use occasional emoji
- Suggest natural next steps: "Want to see reviews?" / "Shall I add it to your cart?"
- If the user's intent is ambiguous, make your best guess and act — don't ask clarifying questions unless truly necessary
- If tools are unavailable, tell the user to add an MCP server from the sidebar`,
      messages,
      tools: mcpClient.tools,
      maxSteps: 20,
      onError: (error) => {
        console.error(`Stream error [${requestId}]:`, JSON.stringify(error, null, 2));
      },
      async onFinish() {
        responseCompleted = true;
        await cleanup();
      },
    });

    req.signal.addEventListener('abort', async () => {
      if (!responseCompleted) {
        console.log(`Request aborted [${requestId}], cleaning up`);
        try {
          await cleanup();
        } catch (e) {
          console.error(`Cleanup error on abort [${requestId}]:`, e);
        }
      }
    });

    result.consumeStream();

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        if (error instanceof Error) {
          if (error.message.includes('Rate limit')) {
            return 'Rate limit exceeded. Please try again later.';
          }
          return `${error.message} (request: ${requestId})`;
        }
        console.error(`Unknown stream error [${requestId}]:`, error);
        return `An error occurred. (request: ${requestId})`;
      },
    });
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(`Cleanup error after failure [${requestId}]:`, cleanupError);
    }
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    console.error(`Chat route failure [${requestId}]:`, error);
    return Response.json(
      {
        error: message,
        requestId,
      },
      { status: 500 },
    );
  }
}
