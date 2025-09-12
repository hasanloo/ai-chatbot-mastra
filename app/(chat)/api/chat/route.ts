import { auth, type UserType } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '../../actions';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import { createAssistantAgent } from '@/mastra/agents/assistant-agent';
import { getTextFromMessage, generateUUID } from '@/lib/utils';

export const maxDuration = 60;

// Validate and map UI model IDs to provider model IDs
function validateAndMapModel(selectedModel: string): string {
  const modelMap: Record<string, string> = {
    'chat-model': 'chat-model',
    'chat-model-reasoning': 'chat-model-reasoning',
  };

  return modelMap[selectedModel] || 'chat-model'; // Default to chat-model if invalid
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    // Validate and map the selected model
    const modelId = validateAndMapModel(selectedChatModel);

    // Create dynamic agent with user-selected model
    const dynamicAgent = createAssistantAgent(modelId);

    // Create a thread context for the conversation
    // Using the chat ID as the thread ID for consistency with existing UI
    const threadContext = {
      threadId: id,
      resourceId: session.user.id, // Group conversations by user
    };

    // Mastra Memory automatically handles message storage and title generation
    const agentStream = await dynamicAgent.streamVNext(
      getTextFromMessage(message),
      {
        format: 'aisdk',
        memory: {
          thread: { id: threadContext.threadId },
          resource: threadContext.resourceId,
        },
        onStepFinish: async (stepOutput) => {
          if (stepOutput.text) {
            // Generate a unique UUID for the assistant message
            const messageId = generateUUID();

            try {
              await saveMessages({
                messages: [
                  {
                    chatId: id,
                    id: messageId,
                    role: 'assistant',
                    parts: [
                      {
                        type: 'text',
                        text: stepOutput.text,
                      },
                    ],
                    attachments: [],
                    createdAt: new Date(),
                  },
                ],
              });
            } catch (error) {
              console.error('Error saving assistant message:', error);
            }
          }
        },
      },
    );

    // We need to manually handle the stream to inject document creation events
    const response = agentStream.toUIMessageStreamResponse();
    return response;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Unhandled error in chat API:', error);
    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
