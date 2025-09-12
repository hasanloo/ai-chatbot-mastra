import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { google } from '@ai-sdk/google';
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
      - Leverage conversation history to provide contextually aware responses

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
  embedder: google.textEmbedding('text-embedding-004'),
  options: {
    lastMessages: 10, // Consider last 10 messages for context
    semanticRecall: {
      topK: 3, // Retrieve top 3 most relevant messages
      messageRange: 2, // Include 2 messages before/after each relevant match
    },
    workingMemory: {
      enabled: true,
      scope: 'resource',
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

export function createAssistantAgent(modelId: string): Agent {
  // Return cached agent if it already exists
  if (agentCache.has(modelId)) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return agentCache.get(modelId)!;
  }

  // Create new agent and cache it
  const agent = new Agent({
    name: 'Assistant Agent',
    instructions: ASSISTANT_INSTRUCTIONS,
    model: myProvider.languageModel(modelId),
    tools: {
      weatherTool,
    },
    memory: sharedMemory, // Use singleton memory instance
  });

  agentCache.set(modelId, agent);
  return agent;
}

// Default assistant agent for backward compatibility
export const assistantAgent = createAssistantAgent('chat-model');
