import { getLanguageModel, type modelID } from '@/ai/providers';
import { streamText, type UIMessage } from 'ai';
import { initializeMCPClients, type MCPServerConfig } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const {
    messages,
    selectedModel,
    mcpServers = [],
  }: {
    messages: UIMessage[];
    selectedModel: modelID;
    mcpServers?: MCPServerConfig[];
  } = await req.json();

  const { tools, cleanup } = await initializeMCPClients(mcpServers, req.signal);

  let responseCompleted = false;

  const result = streamText({
    model: getLanguageModel(selectedModel),
    system: `You are a helpful e-commerce shopping assistant with access to product tools.

    Today's date is ${new Date().toISOString().split('T')[0]}.

    Use the available tools to help users browse products, search, filter by category, and manage their shopping cart.
    Always respond after using tools for a better user experience.
    Use one tool at a time. If you need to use multiple tools, pick the most relevant one.
    
    If tools are not available, tell the user they can add an MCP server from the sidebar.
    
    ## Response Format
    - Markdown is supported.
    - Respond according to tool's response.
    - If you don't know the answer, use the tools to find the answer.`,
    messages,
    tools,
    maxSteps: 20,
    onError: (error) => {
      console.error('Stream error:', JSON.stringify(error, null, 2));
    },
    async onFinish() {
      responseCompleted = true;
      await cleanup();
    },
  });

  req.signal.addEventListener('abort', async () => {
    if (!responseCompleted) {
      console.log('Request aborted, cleaning up');
      try { await cleanup(); } catch (e) {
        console.error('Cleanup error on abort:', e);
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
        return error.message;
      }
      console.error(error);
      return 'An error occurred.';
    },
  });
}
