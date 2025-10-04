#!/usr/bin/env tsx
/**
 * LongMemEval Evaluation CLI Script
 *
 * Runs LongMemEval evaluation from command line.
 *
 * Note: Environment variables are loaded via tsx --env-file flags in package.json
 */

import { createEvaluationRunner } from '@/lib/eval/evaluation-runner';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  const parsed: {
    dataset: 's' | 'm' | 'oracle';
    subset?: number;
    outputDir: string;
    help: boolean;
  } = {
    dataset: 's',
    outputDir: process.env.LONGMEMEVAL_OUTPUT_DIR || '.',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--dataset':
      case '-d': {
        const dataset = args[++i];
        if (!['s', 'm', 'oracle'].includes(dataset)) {
          console.error(
            `Invalid dataset: ${dataset}. Must be 's', 'm', or 'oracle'`,
          );
          process.exit(1);
        }
        parsed.dataset = dataset as 's' | 'm' | 'oracle';
        break;
      }
      case '--subset':
      case '-n':
        parsed.subset = Number.parseInt(args[++i]);
        if (Number.isNaN(parsed.subset) || parsed.subset < 1) {
          console.error('Invalid subset value. Must be a positive integer');
          process.exit(1);
        }
        break;
      case '--output-dir':
      case '-o':
        parsed.outputDir = args[++i];
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  return parsed;
}

const config = parseArgs();

if (config.help) {
  console.log(`
LongMemEval Evaluation Runner

Usage:
  pnpm run eval:longmemeval [options]

Options:
  -d, --dataset <s|m|oracle>    Dataset variant to use (default: s)
                                s      = Small dataset (~40 sessions, ~115k tokens, 500 questions)
                                m      = Medium dataset (~500 sessions, 500 questions)
                                oracle = Oracle dataset (only evidence sessions, 500 questions)

  -n, --subset <number>         Run only first N questions (for quick testing)
                                Example: --subset 10 runs only first 10 questions

  -o, --output-dir <path>       Output directory for results (default: current directory)

  -h, --help                    Show this help message

Examples:
  pnpm run eval:longmemeval
  pnpm run eval:longmemeval --dataset m
  pnpm run eval:longmemeval --dataset s --subset 10
  pnpm run eval:longmemeval --dataset oracle --output-dir ./results

Notes:
  - Dataset files must be downloaded first to data/ directory
  - Results are saved as timestamped JSON: longmemeval-results-YYYYMMDD-HHMMSS.json
  - Uses GPT-5-mini as LLM-as-judge for scoring (requires OPENAI_API_KEY)
  - Gemini models do not support deterministic seed (results may vary between runs)
  `);
  process.exit(0);
}

// Map dataset name to file path
const datasetPaths: Record<'s' | 'm' | 'oracle', string> = {
  s: 'data/longmemeval_s.json',
  m: 'data/longmemeval_m.json',
  oracle: 'data/longmemeval_oracle.json',
};

const datasetPath = datasetPaths[config.dataset];

const runner = createEvaluationRunner();

console.log('[LongMemEval] Starting evaluation...');
console.log(`[LongMemEval] Dataset: ${config.dataset} (${datasetPath})`);
if (config.subset) {
  console.log(`[LongMemEval] Subset: First ${config.subset} questions only`);
}
console.log(`[LongMemEval] Output directory: ${config.outputDir}\n`);

runner
  .run({
    datasetPath,
    outputDir: config.outputDir,
    subset: config.subset,
    onProgress: (progress) => {
      if (progress.currentQuestion) {
        console.log(
          `[${progress.completedQuestions + 1}/${progress.totalQuestions}] Question ID: ${progress.currentQuestion.questionId}`,
        );
      }
    },
  })
  .then((result) => {
    console.log('\n[LongMemEval] Evaluation complete!');
    console.log(
      `[LongMemEval] Total questions: ${result.metadata.total_questions}`,
    );
    console.log(
      `[LongMemEval] Completed: ${result.metadata.completed_questions}`,
    );
    console.log(`[LongMemEval] Failed: ${result.metadata.failed_questions}`);
    console.log(
      `[LongMemEval] Accuracy: ${(result.metadata.accuracy * 100).toFixed(2)}%`,
    );
    console.log(
      `[LongMemEval] Average Score: ${result.metadata.average_score.toFixed(4)}`,
    );
    console.log(`[LongMemEval] Output written to: ${result.outputFilePath}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('[LongMemEval] Evaluation failed:', error.message);
    console.error(error);
    process.exit(1);
  });
