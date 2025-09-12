import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { assistantAgent } from './agents/assistant-agent';

export const mastra = new Mastra({
  agents: { assistantAgent },
  storage: new PostgresStore({
    // biome-ignore lint: Forbidden non-null assertion.
    connectionString: process.env.POSTGRES_URL!,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
