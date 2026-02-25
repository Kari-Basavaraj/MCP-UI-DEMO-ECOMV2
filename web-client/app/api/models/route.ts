import { fetchOpenRouterModels } from '@/ai/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchOpenRouterModels();
  return Response.json(data);
}
