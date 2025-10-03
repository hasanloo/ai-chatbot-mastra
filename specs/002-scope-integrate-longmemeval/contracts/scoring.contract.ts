/**
 * Contract: F1 Token Overlap Scoring
 *
 * Responsible for computing F1 token overlap scores between predicted and gold answers.
 * F1 score measures the harmonic mean of precision and recall at the token level.
 */

/**
 * Scorer interface for computing F1 token overlap
 */
export interface F1Scorer {
  /**
   * Compute F1 token overlap score between prediction and gold answer.
   *
   * F1 = 2 * (precision * recall) / (precision + recall)
   * where:
   * - precision = true_positives / (true_positives + false_positives)
   * - recall = true_positives / (true_positives + false_negatives)
   * - true_positives = tokens in both prediction and gold answer
   * - false_positives = tokens in prediction but not in gold answer
   * - false_negatives = tokens in gold answer but not in prediction
   *
   * @param prediction - The generated/predicted answer from the model
   * @param goldAnswer - The expected/gold standard answer
   * @returns F1 score between 0 and 1 (1 = perfect match, 0 = no overlap)
   */
  computeF1(prediction: string, goldAnswer: string): number;

  /**
   * Compute detailed scoring metrics (precision, recall, F1, token counts).
   *
   * @param prediction - The generated/predicted answer
   * @param goldAnswer - The expected/gold standard answer
   * @returns Detailed scoring breakdown
   */
  computeDetailedScore(
    prediction: string,
    goldAnswer: string
  ): DetailedF1Score;

  /**
   * Tokenize a string into individual tokens (whitespace-based).
   *
   * @param text - The text to tokenize
   * @returns Array of tokens
   */
  tokenize(text: string): string[];
}

/**
 * Detailed F1 scoring breakdown
 */
export interface DetailedF1Score {
  /** F1 score (harmonic mean of precision and recall) */
  f1: number;

  /** Precision: tp / (tp + fp) */
  precision: number;

  /** Recall: tp / (tp + fn) */
  recall: number;

  /** True positives: tokens in both prediction and gold */
  truePositives: number;

  /** False positives: tokens in prediction but not gold */
  falsePositives: number;

  /** False negatives: tokens in gold but not prediction */
  falseNegatives: number;

  /** Total tokens in prediction */
  predictionTokenCount: number;

  /** Total tokens in gold answer */
  goldTokenCount: number;

  /** Tokens found in both prediction and gold (for debugging) */
  commonTokens: string[];
}

/**
 * Scoring configuration options
 */
export interface ScoringConfig {
  /**
   * Whether to normalize text before tokenization
   * (lowercase, trim whitespace)
   * @default true
   */
  normalize?: boolean;

  /**
   * Tokenization strategy
   * @default 'whitespace'
   */
  tokenizationStrategy?: 'whitespace' | 'punctuation-aware';

  /**
   * Whether to remove stopwords before scoring
   * @default false
   */
  removeStopwords?: boolean;
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: Required<ScoringConfig> = {
  normalize: true,
  tokenizationStrategy: 'whitespace',
  removeStopwords: false,
} as const;

/**
 * Edge case handling specifications
 */
export const EDGE_CASES = {
  /** F1 score when both prediction and gold are empty */
  BOTH_EMPTY: 1.0,

  /** F1 score when prediction is empty but gold is not */
  PREDICTION_EMPTY: 0.0,

  /** F1 score when gold is empty but prediction is not */
  GOLD_EMPTY: 0.0,

  /** F1 score when there are no common tokens */
  NO_OVERLAP: 0.0,
} as const;
