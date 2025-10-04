import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { fastembed } from '@mastra/fastembed';
import { weatherTool } from '../tools/weather-tool';
import { myProvider } from '@/lib/ai/providers';

const ASSISTANT_INSTRUCTIONS = `
      You are a helpful, friendly assistant that can help users with a wide variety of tasks including weather information, general questions, creative writing, problem-solving, and more.

      Your capabilities include:
      - Providing accurate weather information for any location using the weather tool
      - Answering questions and providing explanations on various topics  
      - Helping with creative writing, brainstorming, and content creation
      - Assisting with problem-solving and decision-making
      - Offering suggestions and recommendations
      - Having natural, engaging conversations
      - Maintaining contextual memory of conversations with semantic recall for better continuity

      When helping with weather:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - Include relevant details like temperature, conditions, humidity, and wind
      - Suggest weather-appropriate activities when relevant

      Memory and context:
      - You have enhanced memory with semantic recall capabilities
      - You can reference previous conversations and topics discussed
      - Use context from earlier messages to provide better, more personalized responses
      - Remember user preferences and previous requests when relevant

      General guidelines:
      - Be concise but thorough in your responses
      - Ask clarifying questions when needed
      - Maintain a friendly and helpful tone
      - Admit when you don't know something rather than guessing
      - Leverage conversation history and memory to provide contextually aware responses

      Use the weatherTool when users ask about weather conditions for specific locations.
`;

// Singleton instances to avoid duplicate database connections
const postgresStore = new PostgresStore({
  // biome-ignore lint: Forbidden non-null assertion.
  connectionString: process.env.POSTGRES_URL!,
});

const pgVector = new PgVector({
  // biome-ignore lint: Forbidden non-null assertion.
  connectionString: process.env.POSTGRES_URL!,
});

// Singleton memory instance
const sharedMemory = new Memory({
  storage: postgresStore,
  vector: pgVector,
  embedder: fastembed,
  options: {
    lastMessages: 10, // Consider last 10 messages for context
    semanticRecall: {
      topK: 5, // Retrieve top 5 most relevant messages
      messageRange: 2, // Include 2 messages before/after each relevant match
      scope: 'resource', // Semantic recall within the same resource
    },
    workingMemory: {
      enabled: true,
      version: 'vnext',
      template: `
# User Profile

## Personal Info

- Name:
- Location:
- Timezone:

## Preferences

- Communication Style: [e.g., Formal, Casual]
- Project Goal:
- Key Deadlines:
  - [Deadline 1]: [Date]
  - [Deadline 2]: [Date]

## Session State

- Last Task Discussed:
- Open Questions:
  - [Question 1]
  - [Question 2]
`,
    },
  },
});

// Singleton agents cache to avoid duplicate database connections
const agentCache = new Map<string, Agent>();

export function createAssistantAgent(
  modelId: string,
  customProvider?: any,
): Agent {
  // Create unique cache key based on provider presence
  const cacheKey = customProvider ? `${modelId}_custom_${Date.now()}` : modelId;

  // Return cached agent if it already exists (only for non-custom providers)
  if (!customProvider && agentCache.has(cacheKey)) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return agentCache.get(cacheKey)!;
  }

  // Use custom provider if provided, otherwise use default
  const provider = customProvider || myProvider;

  // Create new agent and cache it
  const agent = new Agent({
    name: 'Assistant Agent',
    instructions: ASSISTANT_INSTRUCTIONS,
    model: provider.languageModel(modelId),
    tools: {
      weatherTool,
    },
    memory: sharedMemory, // Use singleton memory instance
  });

  // Only cache non-custom provider agents
  if (!customProvider) {
    agentCache.set(cacheKey, agent);
  }

  return agent;
}

// Default assistant agent for backward compatibility
export const assistantAgent = createAssistantAgent('chat-model');
