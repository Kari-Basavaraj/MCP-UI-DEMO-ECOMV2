import { fetchOpenRouterModels, getFallbackOpenRouterModels } from '@/ai/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = globalThis.crypto?.randomUUID?.() || `models-${Date.now()}`;
  try {
    const data = await fetchOpenRouterModels();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected model fetch error';
    console.error(`Model route failure [${requestId}]:`, error);
    // Keep response shape stable and preserve a usable model list during transient failures.
    return Response.json({
      ...getFallbackOpenRouterModels(),
      error: message,
      requestId,
    });
  }
}
