/**
 * Contract: LLM-as-Judge Scoring
 *
 * Responsible for evaluating answer correctness using an LLM as a judge,
 * following the official LongMemEval methodology.
 * Uses GPT-4o-mini with the evaluation prompt from LongMemEval paper.
 */

/**
 * Scorer interface for LLM-as-judge evaluation
 */
export interface LLMJudgeScorer {
  /**
   * Evaluate whether the model's answer is correct using an LLM judge.
   *
   * Uses the official LongMemEval evaluation prompt:
   * "I will give you a question, a correct answer, and a response from a model.
   * Please answer yes if the response contains the correct answer. Otherwise,
   * answer no. If the response is equivalent to the correct answer or contains
   * all the intermediate steps to get the correct answer, you should also answer yes."
   *
   * @param question - The evaluation question
   * @param goldAnswer - The expected/gold standard answer
   * @param modelAnswer - The model's generated answer
   * @returns Promise resolving to detailed evaluation result
   */
  evaluateAnswer(
    question: string,
    goldAnswer: string,
    modelAnswer: string,
  ): Promise<LLMJudgeResult>;
}

/**
 * Result from LLM judge evaluation
 */
export interface LLMJudgeResult {
  /** Binary score: 1 if correct, 0 if incorrect */
  score: 0 | 1;

  /** The judge's verdict (yes/no) */
  verdict: 'yes' | 'no';

  /** Optional reasoning from the judge explaining the verdict */
  reasoning?: string;

  /** Metadata about the evaluation */
  metadata: {
    /** Judge model used (e.g., "gpt-4o-mini") */
    judgeModel: string;

    /** Timestamp of evaluation */
    evaluatedAt: string;

    /** Prompt tokens used */
    promptTokens?: number;

    /** Completion tokens used */
    completionTokens?: number;
  };
}

/**
 * Configuration for LLM judge scorer
 */
export interface LLMJudgeScorerConfig {
  /**
   * Judge model to use
   * @default 'gpt-4o-mini'
   */
  judgeModel?: string;

  /**
   * Temperature for judge model (0 for deterministic)
   * @default 0
   */
  temperature?: number;

  /**
   * Maximum retries on API failures
   * @default 3
   */
  maxRetries?: number;

  /**
   * Whether to include reasoning in the response
   * @default true
   */
  includeReasoning?: boolean;

  /**
   * Custom evaluation prompt (defaults to LongMemEval prompt)
   */
  customPrompt?: string;
}

/**
 * Default LLM judge scorer configuration
 */
export const DEFAULT_LLM_JUDGE_CONFIG: Required<LLMJudgeScorerConfig> = {
  judgeModel: 'gpt-5-mini',
  temperature: 0,
  maxRetries: 3,
  includeReasoning: true,
  customPrompt:
    'I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes.',
} as const;

/**
 * Error types for LLM judge scorer
 */
export class LLMJudgeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'API_ERROR'
      | 'INVALID_RESPONSE'
      | 'RATE_LIMIT'
      | 'TIMEOUT'
      | 'INVALID_VERDICT',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LLMJudgeError';
  }
}
