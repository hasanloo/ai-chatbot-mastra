/**
 * Evaluation Runner
 *
 * Orchestrates complete LongMemEval dataset evaluation:
 * loading, running evaluations, tracking progress, and generating output.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  type EvaluationRunner,
  type EvaluationRunConfig,
  type EvaluationRunResult,
  type EvaluationProgress,
  EvaluationRunnerError,
  DEFAULT_EVALUATION_CONFIG,
  generateOutputFilename,
} from '@/specs/002-scope-integrate-longmemeval/contracts/evaluation-runner.contract';
import { createDatasetLoader } from './dataset-loader';
import { createConversationReplayer } from './conversation-replayer';

/**
 * Implementation of evaluation runner
 */
export class LongMemEvalEvaluationRunner implements EvaluationRunner {
  private progress: EvaluationProgress;
  private cancelled = false;

  constructor() {
    this.progress = {
      status: 'idle',
      totalQuestions: 0,
      completedQuestions: 0,
      failedQuestions: 0,
    };
  }

  /**
   * Run complete evaluation
   */
  async run(config: EvaluationRunConfig): Promise<EvaluationRunResult> {
    const effectiveConfig = { ...DEFAULT_EVALUATION_CONFIG, ...config };

    try {
      // 1. Load dataset
      this.updateProgress({ status: 'loading_dataset' });
      const loader = createDatasetLoader();
      const questions = await loader.load(config.datasetPath);

      // Apply subset if specified
      const questionsToEvaluate = config.subset
        ? questions.slice(0, config.subset)
        : questions;

      this.updateProgress({
        status: 'running',
        totalQuestions: questionsToEvaluate.length,
      });

      // 2. Initialize results tracking
      const results: any[] = [];
      const errors: any[] = [];
      const startedAt = new Date().toISOString();

      // 3. Create replayer
      const replayer = createConversationReplayer(effectiveConfig.replayConfig);

      // 4. Evaluate each question
      for (let i = 0; i < questionsToEvaluate.length; i++) {
        if (this.cancelled) {
          this.updateProgress({ status: 'cancelling' });
          break;
        }

        const question = questionsToEvaluate[i];

        this.updateProgress({
          currentQuestion: {
            questionId: question.question_id,
            index: i,
          },
        });

        // Call progress callback if provided
        if (effectiveConfig.onProgress) {
          effectiveConfig.onProgress(this.progress);
        }

        try {
          // Evaluate question
          const result = await replayer.replayAndEvaluate(question, effectiveConfig.replayConfig);

          // Add to results
          results.push({
            question_id: result.questionId,
            question_type: result.questionType,
            question: result.question,
            answer: result.goldAnswer,
            model_answer: result.modelAnswer,
            score: result.f1Score,
          });

          // Update progress
          this.updateProgress({
            completedQuestions: this.progress.completedQuestions + 1,
            currentAverageF1: this.computeAverageF1(results),
          });
        } catch (error) {
          // Log error and continue (resilient mode)
          errors.push({
            question_id: question.question_id,
            error_message: (error as Error).message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });

          this.updateProgress({
            failedQuestions: this.progress.failedQuestions + 1,
          });

          if (!effectiveConfig.replayConfig?.continueOnError) {
            throw error;
          }
        }
      }

      // 5. Generate output file
      this.updateProgress({ status: 'completed' });
      const completedAt = new Date().toISOString();

      const datasetName = path.basename(config.datasetPath, '.json').replace(/^longmemeval[-_]?/, '');
      const outputFilename = effectiveConfig.outputFilename || generateOutputFilename(datasetName);
      const outputDir = effectiveConfig.outputDir || '.';
      const outputFilePath = path.join(outputDir, outputFilename);

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Compute final average F1
      const averageF1Score = this.computeAverageF1(results);

      const outputData = {
        metadata: {
          dataset_name: datasetName,
          dataset_path: config.datasetPath,
          total_questions: questionsToEvaluate.length,
          completed_questions: results.length,
          failed_questions: errors.length,
          average_f1_score: averageF1Score,
          seed: config.seed,
          started_at: startedAt,
          completed_at: completedAt,
          output_file: outputFilename,
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
      };

      // Write output file
      await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2));

      return {
        metadata: outputData.metadata,
        results,
        errors: errors.length > 0 ? errors : undefined,
        outputFilePath,
      };
    } catch (error) {
      this.updateProgress({ status: 'failed' });
      throw new EvaluationRunnerError(
        (error as Error).message || 'Evaluation failed',
        'evaluation_run',
        error as Error
      );
    }
  }

  /**
   * Get current progress
   */
  getProgress(): EvaluationProgress {
    return { ...this.progress };
  }

  /**
   * Cancel running evaluation
   */
  async cancel(): Promise<void> {
    this.cancelled = true;
    this.updateProgress({ status: 'cancelling' });
  }

  /**
   * Update progress state
   */
  private updateProgress(update: Partial<EvaluationProgress>): void {
    this.progress = { ...this.progress, ...update };
  }

  /**
   * Compute average F1 score from results
   */
  private computeAverageF1(results: Array<{ score: number }>): number {
    if (results.length === 0) {
      return 0;
    }

    const sum = results.reduce((acc, r) => acc + r.score, 0);
    return sum / results.length;
  }
}

/**
 * Create an evaluation runner instance
 */
export function createEvaluationRunner(): EvaluationRunner {
  return new LongMemEvalEvaluationRunner();
}
