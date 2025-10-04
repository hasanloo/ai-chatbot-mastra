/**
 * LongMemEval Dataset Loader
 *
 * Loads and validates LongMemEval dataset JSON files.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  type DatasetLoader,
  type LongMemEvalQuestion,
  type ConversationTurn,
  type DatasetMetadata,
  DatasetLoadError,
  DatasetValidationError,
  VALIDATION_RULES,
} from '@/specs/002-scope-integrate-longmemeval/contracts/dataset-loader.contract';

/**
 * Implementation of LongMemEval dataset loader
 */
export class LongMemEvalDatasetLoader implements DatasetLoader {
  /**
   * Load a LongMemEval dataset from JSON file
   */
  async load(filePath: string): Promise<LongMemEvalQuestion[]> {
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse JSON
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        throw new DatasetLoadError(
          'Invalid JSON format',
          filePath,
          parseError as Error,
        );
      }

      // Validate that it's an array
      if (!Array.isArray(data)) {
        throw new DatasetValidationError('Dataset must be an array', filePath);
      }

      // Validate each question
      const questions: LongMemEvalQuestion[] = [];
      for (let i = 0; i < data.length; i++) {
        if (!this.validateQuestion(data[i])) {
          console.error(
            'Invalid question at index',
            i,
            questions[i - 1].question_id,
          );
          throw new DatasetValidationError(
            'Invalid question schema',
            filePath,
            i,
          );
        }
        questions.push(data[i] as LongMemEvalQuestion);
      }

      return questions;
    } catch (error) {
      if (
        error instanceof DatasetLoadError ||
        error instanceof DatasetValidationError
      ) {
        throw error;
      }

      // Handle file not found or other filesystem errors
      throw new DatasetLoadError(
        (error as Error).message || 'Unknown error',
        filePath,
        error as Error,
      );
    }
  }

  /**
   * Validate a single question entry
   */
  validateQuestion(question: unknown): question is LongMemEvalQuestion {
    if (typeof question !== 'object' || question === null) {
      console.error('Question is not an object');
      return false;
    }

    const q = question as Record<string, unknown>;

    // Check required string fields
    if (typeof q.question_id !== 'string' || q.question_id.length === 0) {
      console.error('Invalid or missing question_id');
      return false;
    }

    if (typeof q.question_type !== 'string') {
      console.error('Invalid or missing question_type');
      return false;
    }

    if (
      typeof q.question !== 'string' ||
      q.question.length < VALIDATION_RULES.MIN_CONTENT_LENGTH
    ) {
      console.error('Invalid or missing question');
      return false;
    }

    if (q.answer.length < VALIDATION_RULES.MIN_CONTENT_LENGTH) {
      console.error('Invalid or missing answer');
      return false;
    }

    if (typeof q.question_date !== 'string') {
      console.error('Invalid or missing question_date');
      return false;
    }

    // Check arrays
    if (!Array.isArray(q.haystack_session_ids)) {
      console.error('Invalid or missing haystack_session_ids');
      return false;
    }

    if (!Array.isArray(q.haystack_dates)) {
      console.error('Invalid or missing haystack_dates');
      return false;
    }

    if (!Array.isArray(q.haystack_sessions)) {
      console.error('Invalid or missing haystack_sessions');
      return false;
    }

    // Validate haystack_sessions structure
    if (
      q.haystack_sessions.length > VALIDATION_RULES.MAX_SESSIONS_PER_QUESTION
    ) {
      console.error('Too many haystack_sessions');
      return false;
    }

    for (const session of q.haystack_sessions) {
      if (!Array.isArray(session)) {
        console.error('Invalid haystack_session structure');
        return false;
      }

      if (session.length > VALIDATION_RULES.MAX_TURNS_PER_SESSION) {
        console.error('Too many turns in haystack_session');
        return false;
      }

      for (const turn of session) {
        if (!this.validateTurn(turn)) {
          console.error('Invalid turn in haystack_session');
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate a conversation turn
   */
  private validateTurn(turn: unknown): turn is ConversationTurn {
    if (typeof turn !== 'object' || turn === null) {
      console.error('Turn is not an object');
      return false;
    }

    const t = turn as Record<string, unknown>;

    // Check role
    if (t.role !== 'user' && t.role !== 'assistant') {
      console.error('Invalid turn role');
      return false;
    }

    // Check content
    if (typeof t.content !== 'string') {
      console.error('Invalid or missing turn content');
      return false;
    }

    // has_answer is optional
    if (t.has_answer !== undefined && typeof t.has_answer !== 'boolean') {
      console.error('Invalid turn has_answer');
      return false;
    }

    return true;
  }

  /**
   * Get dataset metadata without loading full content
   */
  async getDatasetMetadata(filePath: string): Promise<DatasetMetadata> {
    try {
      // Get file stats
      const stats = await fs.stat(filePath);

      // Read and parse file (lightweight - we need to count questions)
      const content = await fs.readFile(filePath, 'utf-8');
      let data: unknown;

      try {
        data = JSON.parse(content);
      } catch (parseError) {
        throw new DatasetLoadError(
          'Invalid JSON format',
          filePath,
          parseError as Error,
        );
      }

      if (!Array.isArray(data)) {
        throw new DatasetLoadError('Dataset must be an array', filePath);
      }

      // Count question types
      const questionTypes: Record<string, number> = {};
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const questionType = (item as Record<string, unknown>).question_type;
          if (typeof questionType === 'string') {
            questionTypes[questionType] =
              (questionTypes[questionType] || 0) + 1;
          }
        }
      }

      // Extract dataset name from filename
      const filename = path.basename(filePath, '.json');
      const datasetName = filename.replace(/^longmemeval[-_]?/, '') || filename;

      return {
        name: datasetName,
        filePath,
        totalQuestions: data.length,
        questionTypes,
        fileSizeBytes: stats.size,
      };
    } catch (error) {
      if (error instanceof DatasetLoadError) {
        throw error;
      }

      throw new DatasetLoadError(
        (error as Error).message || 'Unknown error',
        filePath,
        error as Error,
      );
    }
  }
}

/**
 * Create a default dataset loader instance
 */
export function createDatasetLoader(): DatasetLoader {
  return new LongMemEvalDatasetLoader();
}

/**
 * Convenience function to load a dataset directly
 */
export async function loadDataset(
  filePath: string,
): Promise<LongMemEvalQuestion[]> {
  const loader = createDatasetLoader();
  return await loader.load(filePath);
}
