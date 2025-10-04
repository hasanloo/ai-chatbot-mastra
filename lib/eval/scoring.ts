/**
 * F1 Token Overlap Scorer
 *
 * Implements F1 token overlap scoring for evaluating model answers against gold standards.
 * Uses whitespace tokenization with lowercase normalization.
 */

import {
  type F1Scorer,
  type DetailedF1Score,
  type ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  EDGE_CASES,
} from '@/specs/002-scope-integrate-longmemeval/contracts/scoring.contract';

/**
 * Implementation of F1 token overlap scorer
 */
export class TokenF1Scorer implements F1Scorer {
  private config: Required<ScoringConfig>;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  /**
   * Compute F1 token overlap score
   */
  computeF1(prediction: string, goldAnswer: string): number {
    const detailed = this.computeDetailedScore(prediction, goldAnswer);
    return detailed.f1;
  }

  /**
   * Compute detailed scoring metrics
   */
  computeDetailedScore(
    prediction: string,
    goldAnswer: string
  ): DetailedF1Score {
    // Tokenize both strings
    const predTokens = this.tokenize(prediction);
    const goldTokens = this.tokenize(goldAnswer);

    // Handle edge cases
    if (predTokens.length === 0 && goldTokens.length === 0) {
      return this.createEdgeCaseResult(EDGE_CASES.BOTH_EMPTY, predTokens, goldTokens);
    }

    if (predTokens.length === 0) {
      return this.createEdgeCaseResult(EDGE_CASES.PREDICTION_EMPTY, predTokens, goldTokens);
    }

    if (goldTokens.length === 0) {
      return this.createEdgeCaseResult(EDGE_CASES.GOLD_EMPTY, predTokens, goldTokens);
    }

    // Convert to Sets for efficient intersection/difference operations
    const predSet = new Set(predTokens);
    const goldSet = new Set(goldTokens);

    // Compute set operations
    const commonTokens = Array.from(predSet).filter((token) => goldSet.has(token));
    const truePositives = commonTokens.length;
    const falsePositives = predSet.size - truePositives;
    const falseNegatives = goldSet.size - truePositives;

    // Handle no overlap case
    if (truePositives === 0) {
      return {
        f1: EDGE_CASES.NO_OVERLAP,
        precision: 0,
        recall: 0,
        truePositives: 0,
        falsePositives,
        falseNegatives,
        predictionTokenCount: predTokens.length,
        goldTokenCount: goldTokens.length,
        commonTokens: [],
      };
    }

    // Compute precision and recall
    const precision = truePositives / (truePositives + falsePositives);
    const recall = truePositives / (truePositives + falseNegatives);

    // Compute F1 score (harmonic mean of precision and recall)
    const f1 = (2 * precision * recall) / (precision + recall);

    return {
      f1,
      precision,
      recall,
      truePositives,
      falsePositives,
      falseNegatives,
      predictionTokenCount: predTokens.length,
      goldTokenCount: goldTokens.length,
      commonTokens,
    };
  }

  /**
   * Tokenize text using whitespace splitting
   */
  tokenize(text: string): string[] {
    if (!this.config.normalize) {
      return text.split(/\s+/).filter((token) => token.length > 0);
    }

    // Normalize: lowercase and trim
    const normalized = text.toLowerCase().trim();

    if (normalized.length === 0) {
      return [];
    }

    // Split on whitespace (spaces, tabs, newlines)
    return normalized.split(/\s+/).filter((token) => token.length > 0);
  }

  /**
   * Create edge case result object
   */
  private createEdgeCaseResult(
    f1: number,
    predTokens: string[],
    goldTokens: string[]
  ): DetailedF1Score {
    const predCount = predTokens.length;
    const goldCount = goldTokens.length;

    return {
      f1,
      precision: predCount === 0 ? 0 : f1,
      recall: goldCount === 0 ? 0 : f1,
      truePositives: 0,
      falsePositives: predCount,
      falseNegatives: goldCount,
      predictionTokenCount: predCount,
      goldTokenCount: goldCount,
      commonTokens: [],
    };
  }
}

/**
 * Create a default F1 scorer instance
 */
export function createF1Scorer(config?: Partial<ScoringConfig>): F1Scorer {
  return new TokenF1Scorer(config);
}

/**
 * Convenience function to compute F1 score directly
 */
export function computeF1(prediction: string, goldAnswer: string): number {
  const scorer = createF1Scorer();
  return scorer.computeF1(prediction, goldAnswer);
}
