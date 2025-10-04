import type { ReplayConfig } from './conversation-replayer.contract';

/**
 * Evaluation runner interface
 */
export interface EvaluationRunner {
  /**
   * Run a complete evaluation on a LongMemEval dataset.
   *
   * @param config - Evaluation configuration
   * @returns Promise resolving to the evaluation run result
   * @throws EvaluationRunnerError if evaluation fails critically
   */
  run(config: EvaluationRunConfig): Promise<EvaluationRunResult>;

  /**
   * Get the current progress of a running evaluation.
   *
   * @returns Current evaluation progress
   */
  getProgress(): EvaluationProgress;

  /**
   * Cancel a running evaluation (gracefully stop after current question).
   *
   * @returns Promise resolving when cancellation completes
   */
  cancel(): Promise<void>;
}

/**
 * Evaluation run configuration
 */
export interface EvaluationRunConfig {
  subset: any;
  /** Path to the LongMemEval dataset JSON file */
  datasetPath: string;

  /** Optional: seed for deterministic LLM generation */
  seed?: number;

  /** Optional: output directory for results JSON (defaults to current directory) */
  outputDir?: string;

  /** Optional: custom output filename (defaults to auto-generated timestamp) */
  outputFilename?: string;

  /** Optional: replay configuration */
  replayConfig?: ReplayConfig;

  /** Optional: callback for progress updates */
  onProgress?: (progress: EvaluationProgress) => void;
}

/**
 * Evaluation run result
 */
export interface EvaluationRunResult {
  /** Metadata about the evaluation run */
  metadata: EvaluationMetadata;

  /** Per-question evaluation results */
  results: EvaluationResultOutput[];

  /** Errors encountered during evaluation (if any) */
  errors?: EvaluationError[];

  /** Path to the generated output JSON file */
  outputFilePath: string;
}

/**
 * Evaluation metadata
 */
export interface EvaluationMetadata {
  /** Dataset name (e.g., 'longmemeval_s') */
  dataset_name: string;

  /** Path to source dataset file */
  dataset_path: string;

  /** Total questions in dataset */
  total_questions: number;

  /** Successfully evaluated questions */
  completed_questions: number;

  /** Failed evaluations */
  failed_questions: number;

  /** Mean score (accuracy) across all completed questions */
  average_score: number;

  /** Accuracy (same as average_score for binary scoring) */
  accuracy: number;

  /** Per-metric breakdown of results (5 core memory abilities) */
  metrics_breakdown: MetricBreakdown[];

  /** Seed used for deterministic generation (if any) */
  seed?: number;

  /** Evaluation start timestamp (ISO 8601) */
  started_at: string;

  /** Evaluation completion timestamp (ISO 8601) */
  completed_at: string;

  /** Output filename */
  output_file: string;
}

/**
 * Evaluation result output (for JSON file)
 */
export interface EvaluationResultOutput {
  /** Question ID from dataset */
  question_id: string;

  /** Question type/category */
  question_type: string;

  /** LongMemEval metric category (IE, MR, KU, TR, ABS) */
  metric: string;

  /** Evaluation question text */
  question: string;

  /** Gold standard answer */
  answer: string;

  /** Model-generated answer */
  model_answer: string;

  /** Binary correctness score from LLM judge (0 or 1) */
  score: number;

  /** Optional: reasoning from LLM judge */
  reasoning?: string;
}

/**
 * Evaluation error entry
 */
export interface EvaluationError {
  /** Question ID that failed */
  question_id: string;

  /** Error message */
  error_message: string;

  /** ISO 8601 timestamp when error occurred */
  timestamp: string;
}

/**
 * Evaluation progress (real-time updates during run)
 */
export interface EvaluationProgress {
  /** Current status */
  status: EvaluationStatus;

  /** Total questions to evaluate */
  totalQuestions: number;

  /** Questions completed so far */
  completedQuestions: number;

  /** Questions failed so far */
  failedQuestions: number;

  /** Current question being evaluated (if running) */
  currentQuestion?: {
    questionId: string;
    index: number; // 0-based index in dataset
  };

  /** Running average score/accuracy (updated after each completion) */
  currentAverageScore?: number;

  /** Estimated time remaining in milliseconds (if available) */
  estimatedTimeRemainingMs?: number;
}

/**
 * Evaluation status
 */
export type EvaluationStatus =
  | 'idle'
  | 'loading_dataset'
  | 'running'
  | 'cancelling'
  | 'completed'
  | 'failed';

/**
 * Per-metric breakdown statistics
 */
export interface MetricBreakdown {
  /** Metric code (IE, MR, KU, TR, ABS) */
  metric: string;

  /** Metric full name */
  metric_name: string;

  /** Total questions for this metric */
  total_questions: number;

  /** Successfully evaluated questions for this metric */
  completed_questions: number;

  /** Failed evaluations for this metric */
  failed_questions: number;

  /** Accuracy for this metric (0-1) */
  accuracy: number;
}

/**
 * Output file structure (written to JSON file)
 */
export interface EvaluationOutputFile {
  metadata: EvaluationMetadata;
  results: EvaluationResultOutput[];
  errors?: EvaluationError[];
}

/**
 * Error thrown by the evaluation runner
 */
export class EvaluationRunnerError extends Error {
  constructor(
    message: string,
    public stage: EvaluationStage,
    public cause?: Error,
  ) {
    super(`Evaluation runner error at ${stage}: ${message}`);
    this.name = 'EvaluationRunnerError';
  }
}

/**
 * Stages of the evaluation process
 */
export type EvaluationStage =
  | 'initialization'
  | 'dataset_loading'
  | 'evaluation_run'
  | 'output_generation';

/**
 * Default evaluation run configuration
 */
export const DEFAULT_EVALUATION_CONFIG: Partial<EvaluationRunConfig> = {
  outputDir: '.',
  replayConfig: {
    verbose: true,
    continueOnError: true,
  },
} as const;

/**
 * Output filename generator
 *
 * @param datasetName - Name of the dataset (e.g., 'longmemeval_s')
 * @returns Auto-generated filename with timestamp
 */
export function generateOutputFilename(datasetName: string): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '-');
  return `${datasetName}-results-${timestamp}.json`;
}
