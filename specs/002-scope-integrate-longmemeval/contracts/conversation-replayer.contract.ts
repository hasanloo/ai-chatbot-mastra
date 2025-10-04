/**
 * Contract: Conversation Replayer
 *
 * Responsible for replaying LongMemEval conversations through the chat system,
 * managing mocked responses for context building, and capturing real responses
 * for evaluation questions.
 */

import type { LongMemEvalQuestion } from './dataset-loader.contract';
import type { LLMJudgeResult } from './llm-judge-scorer.contract';

/**
 * Conversation replayer interface
 */
export interface ConversationReplayer {
  /**
   * Replay a complete evaluation question: build context via haystack sessions,
   * then ask the evaluation question and capture the real assistant response.
   *
   * @param question - The LongMemEval question to evaluate
   * @param config - Optional replay configuration
   * @returns Promise resolving to the evaluation result
   * @throws ReplayError if replay fails at any stage
   */
  replayAndEvaluate(
    question: LongMemEvalQuestion,
    config?: ReplayConfig,
  ): Promise<EvaluationResult>;

  /**
   * Replay a single conversation session (sequence of user/assistant turns)
   * using mocked assistant responses.
   *
   * @param session - Array of conversation turns
   * @param chatId - Chat entity ID for this conversation
   * @returns Promise resolving when session replay completes
   * @throws ReplayError if any turn fails
   */
  // replaySession(session: ConversationTurn[], chatId: string): Promise<void>;

  /**
   * Send a user message and get the real assistant response (no mocking).
   *
   * @param message - User message content
   * @param chatId - Chat entity ID
   * @returns Promise resolving to the assistant's response
   * @throws ReplayError if message fails or response generation errors
   */
  // sendRealMessage(message: string, chatId: string): Promise<string>;
}

/**
 * Replay configuration options
 */
export interface ReplayConfig {
  /**
   * Seed for deterministic LLM generation (if supported by model)
   * @default undefined (non-deterministic)
   */
  seed?: number;

  /**
   * Whether to log detailed replay progress
   * @default false
   */
  verbose?: boolean;

  /**
   * Timeout for each message request in milliseconds
   * @default 60000 (60 seconds)
   */
  messageTimeoutMs?: number;

  /**
   * Whether to continue on errors (resilient mode)
   * @default true (per spec: skip failed items, log errors)
   */
  continueOnError?: boolean;
}

/**
 * Conversation turn structure (re-exported for convenience)
 */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  has_answer?: boolean;
}

/**
 * Evaluation result for a single question
 */
export interface EvaluationResult {
  /** Question ID from dataset */
  questionId: string;

  /** Question type/category */
  questionType: string;

  /** The evaluation question text */
  question: string;

  /** Gold standard answer */
  goldAnswer: string;

  /** Model-generated answer */
  modelAnswer: string;

  /** Binary correctness score from LLM judge (0 or 1) */
  score: number;

  /** Detailed result from LLM judge (optional) */
  judgeResult?: LLMJudgeResult;

  /** Chat ID created for this evaluation */
  chatId: string;

  /** Error message if evaluation failed */
  errorMessage?: string;

  /** Timestamp when evaluation was performed */
  evaluatedAt: Date;
}

/**
 * Error thrown during conversation replay
 */
export class ReplayError extends Error {
  constructor(
    message: string,
    public questionId: string,
    public stage: ReplayStage,
    public cause?: Error,
  ) {
    super(`Replay error for ${questionId} at ${stage}: ${message}`);
    this.name = 'ReplayError';
  }
}

/**
 * Stages of the replay process (for error tracking)
 */
export type ReplayStage =
  | 'chat_creation'
  | 'session_replay'
  | 'evaluation_question'
  | 'scoring';

/**
 * Default replay configuration
 */
export const DEFAULT_REPLAY_CONFIG: Required<ReplayConfig> = {
  seed: 0, // Default to 0 for deterministic behavior if not specified
  verbose: false,
  messageTimeoutMs: 60000,
  continueOnError: true,
} as const;
