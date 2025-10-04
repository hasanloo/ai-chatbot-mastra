/**
 * Conversation Replayer
 *
 * Replays LongMemEval conversations through Mastra, managing mocked responses
 * for haystack sessions and capturing real responses for evaluation questions.
 */

import { generateUUID } from '@/lib/utils';
import {
  type ConversationReplayer,
  type EvaluationResult,
  type ReplayConfig,
  ReplayError,
  DEFAULT_REPLAY_CONFIG,
} from '@/specs/002-scope-integrate-longmemeval/contracts/conversation-replayer.contract';
import type { LongMemEvalQuestion } from '@/specs/002-scope-integrate-longmemeval/contracts/dataset-loader.contract';
import { generateChatResponse } from './chat-service';
import { createLLMJudgeScorer } from './llm-judge-scorer';

/**
 * Implementation of conversation replayer
 */
export class LongMemEvalConversationReplayer implements ConversationReplayer {
  private config: Required<ReplayConfig>;

  constructor(config?: Partial<ReplayConfig>) {
    this.config = { ...DEFAULT_REPLAY_CONFIG, ...config };
  }

  /**
   * Replay a complete evaluation question
   */
  async replayAndEvaluate(
    question: LongMemEvalQuestion,
    config?: ReplayConfig,
  ): Promise<EvaluationResult> {
    const effectiveConfig = { ...this.config, ...config };

    try {
      // Create unique resource ID for this question
      const questionUuid = generateUUID();
      const resourceId = `${question.question_id}_${questionUuid}`;

      if (effectiveConfig.verbose) {
        console.log(
          `[Replayer] Starting evaluation for ${question.question_id}`,
        );
        console.log(`[Replayer] Resource ID: ${resourceId}`);
      }

      // Replay each haystack session as a separate thread
      for (
        let sessionIdx = 0;
        sessionIdx < question.haystack_sessions.length;
        sessionIdx++
      ) {
        const session = question.haystack_sessions[sessionIdx];
        const threadId = generateUUID(); // Each session = new thread

        if (effectiveConfig.verbose) {
          console.log(
            `[Replayer] Replaying session ${sessionIdx + 1}/${question.haystack_sessions.length} (${session.length} turns) - Thread: ${threadId}`,
          );
        }

        // Process each turn in the session
        for (let i = 0; i < session.length; i++) {
          const turn = session[i];

          if (turn.role === 'user') {
            // Find expected assistant response (next turn)
            const nextTurn = session[i + 1];
            const expectedResponse =
              nextTurn?.role === 'assistant' ? nextTurn.content : '';

            // Generate with mock response
            await generateChatResponse(
              turn.content,
              resourceId,
              threadId,
              expectedResponse,
            );
          }
        }
      }

      // Ask evaluation question on new thread with real model
      if (effectiveConfig.verbose) {
        console.log(`[Replayer] Asking evaluation question...`);
      }

      const evalThreadId = generateUUID();
      const modelAnswer = await generateChatResponse(
        question.question,
        resourceId,
        evalThreadId,
        // No expectedResponse - uses real model
      );

      // Evaluate with LLM judge
      const scorer = createLLMJudgeScorer();
      const judgeResult = await scorer.evaluateAnswer(
        question.question,
        question.answer,
        modelAnswer,
      );

      if (effectiveConfig.verbose) {
        console.log(`[Replayer] Model Answer: ${modelAnswer}`);
        console.log(`[Replayer] Gold Answer: ${question.answer}`);
        console.log(
          `[Replayer] LLM Judge Score: ${judgeResult.score} (${judgeResult.verdict})`,
        );
        if (judgeResult.reasoning) {
          console.log(`[Replayer] Judge Reasoning: ${judgeResult.reasoning}`);
        }
      }

      return {
        questionId: question.question_id,
        questionType: question.question_type,
        question: question.question,
        goldAnswer: question.answer,
        modelAnswer,
        score: judgeResult.score,
        judgeResult,
        chatId: resourceId,
        evaluatedAt: new Date(),
      };
    } catch (error) {
      throw new ReplayError(
        (error as Error).message || 'Unknown error',
        question.question_id,
        'evaluation_question',
        error as Error,
      );
    }
  }
}

/**
 * Create a conversation replayer instance
 */
export function createConversationReplayer(
  config?: Partial<ReplayConfig>,
): ConversationReplayer {
  return new LongMemEvalConversationReplayer(config);
}
