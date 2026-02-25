import { createOpenAI } from '@ai-sdk/openai';

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  contextLength?: number;
  pricing?: { prompt: string; completion: string };
}

/**
 * Create an OpenRouter-backed language model instance for any model ID.
 * This is called per-request in the chat route so we don't need to
 * pre-register every model up front.
 */
export function getLanguageModel(modelId: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in .env.local');
  }
  const client = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });
  return client(modelId);
}

export type modelID = string;

/* ---------- OpenRouter models list (cached) ---------- */

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
  architecture?: { modality?: string };
}

let _modelsCache: { models: string[]; details: Record<string, ModelInfo>; defaultModel: string } | null = null;
let _modelsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchOpenRouterModels(): Promise<{
  models: string[];
  details: Record<string, ModelInfo>;
  defaultModel: string;
}> {
  const now = Date.now();
  if (_modelsCache && now - _modelsCacheTime < CACHE_TTL) {
    return _modelsCache;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { models: [], details: {}, defaultModel: '' };
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter API ${res.status}`);
    const json = await res.json();
    const data: OpenRouterModel[] = json.data || [];

    // Filter to text/chat models only (exclude image-gen, moderation, etc.)
    const chatModels = data.filter((m) => {
      const modality = m.architecture?.modality || '';
      // Keep text→text models; skip pure image/audio generators
      if (modality && !modality.includes('text') && modality !== '') return false;
      return true;
    });

    // Sort: popular providers first, then alphabetical
    const providerOrder = ['anthropic', 'openai', 'google', 'meta-llama', 'mistralai', 'deepseek'];
    chatModels.sort((a, b) => {
      const pa = providerOrder.indexOf(a.id.split('/')[0]);
      const pb = providerOrder.indexOf(b.id.split('/')[0]);
      const oa = pa === -1 ? 999 : pa;
      const ob = pb === -1 ? 999 : pb;
      if (oa !== ob) return oa - ob;
      return a.id.localeCompare(b.id);
    });

    const models: string[] = [];
    const details: Record<string, ModelInfo> = {};

    for (const m of chatModels) {
      models.push(m.id);
      const provider = m.id.split('/')[0] || 'unknown';
      details[m.id] = {
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        name: m.name || m.id,
        description: m.description?.slice(0, 120) || '',
        contextLength: m.context_length,
        pricing: m.pricing,
      };
    }

    // Default to a known reliable model
    const preferred = ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'];
    const defaultModel = preferred.find((p) => models.includes(p)) || models[0] || '';

    _modelsCache = { models, details, defaultModel };
    _modelsCacheTime = now;
    return _modelsCache;
  } catch (err) {
    console.error('Failed to fetch OpenRouter models:', err);
    // Fallback to a few known models
    const fallback = ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001'];
    const details: Record<string, ModelInfo> = {
      'openai/gpt-4o-mini': { provider: 'OpenAI', name: 'GPT-4o Mini', description: 'Fast & affordable' },
      'anthropic/claude-3.5-sonnet': { provider: 'Anthropic', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
      'google/gemini-2.0-flash-001': { provider: 'Google', name: 'Gemini 2.0 Flash', description: 'Google fast model' },
    };
    return { models: fallback, details, defaultModel: fallback[0] };
  }
}
