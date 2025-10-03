/**
 * Contract: Conversation Replayer
 *
 * Responsible for replaying LongMemEval conversations through the chat system,
 * managing mocked responses for context building, and capturing real responses
 * for evaluation questions.
 */

import type { LongMemEvalQuestion } from './dataset-loader.contract';
import type { DetailedF1Score } from './scoring.contract';

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
    config?: ReplayConfig
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
  replaySession(
    session: ConversationTurn[],
    chatId: string
  ): Promise<void>;

  /**
   * Send a user message and get the real assistant response (no mocking).
   *
   * @param message - User message content
   * @param chatId - Chat entity ID
   * @returns Promise resolving to the assistant's response
   * @throws ReplayError if message fails or response generation errors
   */
  sendRealMessage(message: string, chatId: string): Promise<string>;

  /**
   * Create a new Chat entity for an evaluation question.
   *
   * @param questionId - Unique question identifier (for chat title)
   * @returns Promise resolving to the created Chat ID
   * @throws ReplayError if chat creation fails
   */
  createEvaluationChat(questionId: string): Promise<string>;
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

  /** F1 token overlap score (0-1) */
  f1Score: number;

  /** Detailed scoring breakdown (optional) */
  detailedScore?: DetailedF1Score;

  /** Chat ID created for this evaluation */
  chatId: string;

  /** Error message if evaluation failed */
  errorMessage?: string;

  /** Timestamp when evaluation was performed */
  evaluatedAt: Date;
}

/**
 * Chat service abstraction for dependency injection and mocking
 */
export interface ChatService {
  /**
   * Generate an assistant response to a user message.
   *
   * @param message - User message content
   * @param chatId - Chat entity ID for context
   * @returns Promise resolving to assistant response
   */
  generateResponse(message: string, chatId: string): Promise<string>;
}

/**
 * Production chat service (uses real Mastra agent)
 */
export interface ProductionChatService extends ChatService {
  /**
   * Generate response using the real Mastra assistant agent.
   */
  generateResponse(message: string, chatId: string): Promise<string>;
}

/**
 * Mocked chat service (uses provider-level mocking to return dataset responses)
 *
 * IMPORTANT: This service STILL calls Mastra's agent - it just uses a mocked LLM provider
 * underneath. This ensures Mastra's memory system works normally during haystack replay.
 *
 * Implementation uses MockLanguageModelV2 from AI SDK to mock only the LLM provider,
 * not the Mastra agent itself.
 */
export interface MockedChatService extends ChatService {
  /**
   * Set the mock response for a specific turn index.
   *
   * @param turnIndex - Zero-based turn index
   * @param response - Mocked assistant response
   */
  setMockResponse(turnIndex: number, response: string): void;

  /**
   * Generate mocked response by calling Mastra agent with mocked LLM provider.
   * The provider returns the pre-defined dataset response for the current turn.
   * Throws if no mock response is set for the current turn.
   */
  generateResponse(message: string, chatId: string): Promise<string>;

  /**
   * Reset the turn index counter (for starting a new conversation).
   */
  reset(): void;
}

/**
 * Error thrown during conversation replay
 */
export class ReplayError extends Error {
  constructor(
    message: string,
    public questionId: string,
    public stage: ReplayStage,
    public cause?: Error
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
  seed: undefined,
  verbose: false,
  messageTimeoutMs: 60000,
  continueOnError: true,
} as const;
