import { z } from 'zod';
import type { InferUITool, UIMessage } from 'ai';
import type { weatherTool } from '@/mastra/tools/weather-tool';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherToolType = InferUITool<typeof weatherTool>;

export type ChatTools = {
  getWeather: weatherToolType;
};

export type CustomUIDataTypes = {
  appendMessage: string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
