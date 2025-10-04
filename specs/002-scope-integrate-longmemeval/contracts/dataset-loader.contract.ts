/**
 * Contract: Dataset Loader
 *
 * Responsible for loading and validating the LongMemEval dataset from JSON files.
 * This contract defines the interface for loading dataset files and ensuring
 * their schema validity before evaluation begins.
 */

/**
 * Dataset loader interface
 */
export interface DatasetLoader {
  /**
   * Load a LongMemEval dataset from a JSON file path.
   *
   * @param filePath - Absolute or relative path to the dataset JSON file
   * @returns Promise resolving to an array of validated evaluation questions
   * @throws DatasetLoadError if file cannot be read or parsed
   * @throws DatasetValidationError if dataset schema is invalid
   */
  load(filePath: string): Promise<LongMemEvalQuestion[]>;

  /**
   * Validate a single question entry against the expected schema.
   *
   * @param question - The question object to validate
   * @returns true if valid, false otherwise
   */
  validateQuestion(question: unknown): question is LongMemEvalQuestion;

  /**
   * Get dataset metadata without loading full content (for preview/info).
   *
   * @param filePath - Path to the dataset JSON file
   * @returns Promise resolving to dataset metadata (name, total questions, etc.)
   * @throws DatasetLoadError if file cannot be read
   */
  getDatasetMetadata(filePath: string): Promise<DatasetMetadata>;
}

/**
 * LongMemEval question structure (from dataset JSON schema)
 */
export interface LongMemEvalQuestion {
  /** Unique question identifier from dataset */
  question_id: string;

  /** Question category (e.g., 'single-session-user', 'temporal-reasoning') */
  question_type: string;

  /** The evaluation question text */
  question: string;

  /** Gold standard answer */
  answer: string;

  /** ISO timestamp of question */
  question_date: string;

  /** List of session identifiers */
  haystack_session_ids: string[];

  /** Timestamps for each session */
  haystack_dates: string[];

  /** Multi-session conversation history */
  haystack_sessions: ConversationTurn[][];
}

/**
 * Individual conversation turn in a session
 */
export interface ConversationTurn {
  /** Speaker role */
  role: 'user' | 'assistant';

  /** Message content */
  content: string;

  /** Optional: marks turns with key evidence */
  has_answer?: boolean;
}

/**
 * Dataset metadata (lightweight info without loading full dataset)
 */
export interface DatasetMetadata {
  /** Dataset name (e.g., 'longmemeval_s', 'longmemeval_m') */
  name: string;

  /** Full file path */
  filePath: string;

  /** Total number of evaluation questions */
  totalQuestions: number;

  /** Breakdown of question types and their counts */
  questionTypes: Record<string, number>;

  /** File size in bytes */
  fileSizeBytes: number;
}

/**
 * Error thrown when dataset file cannot be loaded or parsed
 */
export class DatasetLoadError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public cause?: Error
  ) {
    super(`Failed to load dataset from ${filePath}: ${message}`);
    this.name = 'DatasetLoadError';
  }
}

/**
 * Error thrown when dataset schema validation fails
 */
export class DatasetValidationError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public invalidQuestionIndex?: number
  ) {
    super(
      `Dataset validation failed for ${filePath}${invalidQuestionIndex !== undefined ? ` at question index ${invalidQuestionIndex}` : ''}: ${message}`
    );
    this.name = 'DatasetValidationError';
  }
}

/**
 * Validation rules for LongMemEvalQuestion
 */
export const VALIDATION_RULES = {
  /** Allowed question types */
  ALLOWED_QUESTION_TYPES: [
    'single-session-user',
    'multi-session',
    'temporal-reasoning',
    'knowledge-update',
    'abstention',
  ] as const,

  /** Maximum allowed sessions per question */
  MAX_SESSIONS_PER_QUESTION: 1000,

  /** Maximum turns per session */
  MAX_TURNS_PER_SESSION: 1000,

  /** Minimum content length for question/answer */
  MIN_CONTENT_LENGTH: 1,
} as const;
