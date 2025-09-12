<a href="https://ai-chatbot-mastra.vercel.app/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">AI Chatbot with Mastra</h1>
</a>

<p align="center">
    AI Chatbot with Mastra is a free, open-source template built with Next.js, AI SDK and Mastra that helps you quickly build powerful chatbot applications with contextual memory, and multi-tool capabilities.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#mastra-architecture"><strong>Mastra Architecture</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

### Core Platform
- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication
- [Mastra](https://mastra.ai)
  - Built with [Mastra](https://mastra.ai) for AI agent capabilities such as multi-tool suport, semantic recall, working memory, agent streaming and database message persistance


## Mastra Architecture

This application uses [Mastra](https://mastra.ai), a powerful framework for building AI agents with advanced capabilities. Here's how it's integrated:

### Agent Configuration
- **Assistant Agent** (`/mastra/agents/assistant-agent.ts`): The main conversational AI agent with memory and multi-tool capabilities
- **Singleton Pattern**: Agents are cached to prevent duplicate database connections and optimize performance
- **Dynamic Model Selection**: Supports different model configurations (chat-model, chat-model-reasoning)

### Memory System
- **PostgreSQL Storage**: Uses `@mastra/pg` for persistent memory storage
- **Vector Embeddings**: `google/text-embedding-004` for semantic similarity and context retrieval
- **Working Memory**: Template-based user profile tracking with session state management
- **Semantic Recall**: Retrieves the most relevant previous conversations (top 3 with 2 message range)

### Tool System
Located in `/mastra/tools/`:
- **Weather Tool** (`weather-tool.ts`): Real-time weather information using Open-Meteo API

### Memory Configuration
```typescript
{
  lastMessages: 10,           // Consider last 10 messages for context
  semanticRecall: {
    topK: 3,                  // Retrieve top 3 most relevant messages
    messageRange: 2,          // Include 2 messages before/after each match
  },
  workingMemory: {
    enabled: true,            // User profile and session tracking
    scope: 'resource',        // Per-user memory isolation
    template: '...'           // Structured user profile template
  }
}
```

## Model Providers

This template ships with Google Gemini gemini-2.5-mini and gemini-2.5-pro models as the default. However, with the AI SDK, you can switch LLM providers to OpenAI, Anthropic, Cohere, and many more with just a few lines of code.


## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhasanloo%2Fai-chatbot-mastra&env=AUTH_SECRET,POSTGRES_URL,GOOGLE_GENERATIVE_AI_API_KEY&envDescription=Learn%20more%20about%20how%20to%20get%20the%20API%20Keys%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fhasanloo%2Fai-chatbot-mastra%2Fblob%2Fmain%2F.env.example&demo-title=AI%20Chatbot%20with%20Mastra&demo-description=AI%20Chatbot%20with%20Mastra%20is%20a%20free%2C%20open-source%20template%20built%20with%20Next.js%2C%20AI%20SDK%20and%20Mastra%20that%20helps%20you%20quickly%20build%20powerful%20chatbot%20applications%20with%20contextual%20memory%2C%20and%20multi-tool%20capabilities.&demo-url=https%3A%2F%2Fai-chatbot-mastra.vercel.app%2F&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run the AI Chatbot with Mastra. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

> Note: Ensure pgvector is enables for your postgres ([Enable pgvector in Neon](https://neon.com/docs/extensions/pgvector))

Your app template should now be running on [localhost:3000](http://localhost:3000).
