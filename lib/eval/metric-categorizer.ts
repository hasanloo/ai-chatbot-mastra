/**
 * LongMemEval Metric Categorizer
 *
 * Categorizes evaluation questions into the 5 core memory abilities
 * defined in the LongMemEval benchmark (ICLR 2025).
 *
 * References:
 * - Paper: https://arxiv.org/abs/2410.10813
 * - GitHub: https://github.com/xiaowu0162/LongMemEval
 */

import type { LongMemEvalQuestion } from '@/specs/002-scope-integrate-longmemeval/contracts/dataset-loader.contract';

/**
 * LongMemEval core memory abilities (5 metrics)
 */
export enum LongMemEvalMetric {
  /**
   * Information Extraction (IE)
   * Ability to recall specific information from extensive interactive histories,
   * including details mentioned by either the user or the assistant.
   */
  INFORMATION_EXTRACTION = 'IE',

  /**
   * Multi-Session Reasoning (MR)
   * Ability to synthesize information across multiple history sessions
   * to answer complex questions involving aggregation and comparison.
   */
  MULTI_SESSION_REASONING = 'MR',

  /**
   * Knowledge Updates (KU)
   * Ability to recognize changes in user's personal information
   * and update knowledge dynamically over time.
   */
  KNOWLEDGE_UPDATES = 'KU',

  /**
   * Temporal Reasoning (TR)
   * Awareness of temporal aspects of user information,
   * including both explicit time mentions and timestamp metadata.
   */
  TEMPORAL_REASONING = 'TR',

  /**
   * Abstention (ABS)
   * Ability to identify questions seeking unknown information
   * (not mentioned in interaction history) and answer "I don't know".
   */
  ABSTENTION = 'ABS',
}

/**
 * Metric metadata for display and reporting
 */
export const METRIC_METADATA: Record<
  LongMemEvalMetric,
  { name: string; description: string }
> = {
  [LongMemEvalMetric.INFORMATION_EXTRACTION]: {
    name: 'Information Extraction',
    description:
      'Recall specific information from extensive interactive histories',
  },
  [LongMemEvalMetric.MULTI_SESSION_REASONING]: {
    name: 'Multi-Session Reasoning',
    description:
      'Synthesize information across multiple history sessions for complex questions',
  },
  [LongMemEvalMetric.KNOWLEDGE_UPDATES]: {
    name: 'Knowledge Updates',
    description:
      "Recognize changes in user's personal information and update knowledge dynamically",
  },
  [LongMemEvalMetric.TEMPORAL_REASONING]: {
    name: 'Temporal Reasoning',
    description:
      'Awareness of temporal aspects of user information including time mentions and timestamps',
  },
  [LongMemEvalMetric.ABSTENTION]: {
    name: 'Abstention',
    description:
      'Identify questions seeking unknown information and answer "I don\'t know"',
  },
};

/**
 * Categorize a LongMemEval question into one of the 5 core memory abilities.
 *
 * Categorization rules:
 * 1. If question_id contains "_abs" suffix → ABSTENTION
 * 2. If question_type is "multi-session" → MULTI_SESSION_REASONING
 * 3. If question_type is "knowledge-update" → KNOWLEDGE_UPDATES
 * 4. If question_type is "temporal-reasoning" → TEMPORAL_REASONING
 * 5. Otherwise (single-session-*) → INFORMATION_EXTRACTION
 *
 * @param question - The LongMemEval question to categorize
 * @returns The metric category for this question
 */
export function categorizeQuestion(
  question: LongMemEvalQuestion,
): LongMemEvalMetric {
  // Rule 1: Abstention questions (identified by _abs suffix)
  if (question.question_id.includes('_abs')) {
    return LongMemEvalMetric.ABSTENTION;
  }

  // Rule 2-4: Map question_type to metrics
  switch (question.question_type) {
    case 'multi-session':
      return LongMemEvalMetric.MULTI_SESSION_REASONING;

    case 'knowledge-update':
      return LongMemEvalMetric.KNOWLEDGE_UPDATES;

    case 'temporal-reasoning':
      return LongMemEvalMetric.TEMPORAL_REASONING;

    // Rule 5: All single-session variants → Information Extraction
    case 'single-session-user':
    case 'single-session-assistant':
    case 'single-session-preference':
      return LongMemEvalMetric.INFORMATION_EXTRACTION;

    default:
      // Fallback: treat unknown types as Information Extraction
      console.warn(
        `[MetricCategorizer] Unknown question_type: ${question.question_type}, defaulting to IE`,
      );
      return LongMemEvalMetric.INFORMATION_EXTRACTION;
  }
}

/**
 * Get metric display name
 */
export function getMetricName(metric: LongMemEvalMetric): string {
  return METRIC_METADATA[metric].name;
}

/**
 * Get metric description
 */
export function getMetricDescription(metric: LongMemEvalMetric): string {
  return METRIC_METADATA[metric].description;
}
