import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { google } from '@ai-sdk/google';
import { chatModel, reasoningModel, titleModel, createEvalMockModel } from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': google('gemini-2.5-flash'),
        'chat-model-reasoning': wrapLanguageModel({
          model: google('gemini-2.5-pro'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': google('gemini-2.5-flash-lite'),
      },
    });

/**
 * Factory to create eval mock provider with specific response
 * Used for LongMemEval evaluation to mock assistant responses during haystack replay
 */
export function createEvalMockProvider(response: string) {
  return customProvider({
    languageModels: {
      'eval-mock-model': createEvalMockModel(response),
    },
  });
}
