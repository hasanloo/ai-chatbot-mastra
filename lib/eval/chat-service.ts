/**
 * Chat Service for LongMemEval
 *
 * Simplified chat service that uses a single function with optional mocking.
 * When expectedResponse is provided, uses eval mock provider to return that response.
 * Otherwise, uses the real production model.
 */

import { createEvalMockProvider } from '@/lib/ai/providers';
import { createAssistantAgent } from '@/mastra/agents/assistant-agent';

/**
 * Generate a chat response using Mastra agent
 *
 * @param message - User message content
 * @param resourceId - Resource ID for memory scoping
 * @param threadId - Thread ID for conversation grouping
 * @param expectedResponse - Optional expected response for mock scenarios (haystack replay)
 * @returns Promise resolving to the assistant's response
 */
export async function generateChatResponse(
  message: string,
  resourceId: string,
  threadId: string,
  expectedResponse?: string,
): Promise<string> {
  if (expectedResponse) {
    // Mock scenario - use eval mock provider
    const evalProvider = createEvalMockProvider(expectedResponse);
    const agent = createAssistantAgent('eval-mock-model', evalProvider);
    const result = await agent.generateVNext(message, {
      memory: {
        thread: { id: threadId },
        resource: resourceId,
      },
    });
    return result.text || '';
  }

  // Real scenario - use production model
  const agent = createAssistantAgent('chat-model', undefined);
  const result = await agent.generateVNext(message, {
    memory: {
      thread: { id: threadId },
      resource: resourceId,
    },
  });
  return result.text || '';
}
