/**
 * LLM-as-Judge Scorer Implementation
 *
 * Evaluates answer correctness using GPT-4o-mini as a judge,
 * following the official LongMemEval methodology.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type {
  LLMJudgeScorer,
  LLMJudgeResult,
  LLMJudgeScorerConfig,
} from '@/specs/002-scope-integrate-longmemeval/contracts/llm-judge-scorer.contract';
import { DEFAULT_LLM_JUDGE_CONFIG, LLMJudgeError } from '@/specs/002-scope-integrate-longmemeval/contracts/llm-judge-scorer.contract';

/**
 * Implementation of LLM-as-judge scorer using GPT-4o-mini
 */
export class OpenAIJudgeScorer implements LLMJudgeScorer {
  private config: Required<LLMJudgeScorerConfig>;

  constructor(config?: Partial<LLMJudgeScorerConfig>) {
    this.config = { ...DEFAULT_LLM_JUDGE_CONFIG, ...config };
  }

  /**
   * Evaluate answer correctness using LLM judge
   */
  async evaluateAnswer(
    question: string,
    goldAnswer: string,
    modelAnswer: string
  ): Promise<LLMJudgeResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await this.callJudgeModel(
          question,
          goldAnswer,
          modelAnswer
        );
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on invalid verdict errors
        if (error instanceof Error && error.message.includes('Invalid verdict')) {
          throw error;
        }

        // Log the error for debugging
        console.error(`[LLM Judge] Attempt ${attempt + 1} failed:`, error);

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries exhausted
    const errorMessage = lastError instanceof Error
      ? `Failed after ${this.config.maxRetries} attempts. Last error: ${lastError.message}`
      : `Failed after ${this.config.maxRetries} attempts`;

    throw this.createError('TIMEOUT', errorMessage, lastError);
  }

  /**
   * Call the judge model to evaluate the answer
   */
  private async callJudgeModel(
    question: string,
    goldAnswer: string,
    modelAnswer: string
  ): Promise<LLMJudgeResult> {
    const prompt = this.buildPrompt(question, goldAnswer, modelAnswer);

    try {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const { text, usage } = await generateText({
        model: openai(this.config.judgeModel),
        temperature: this.config.temperature,
        prompt,
      });

      const { verdict, reasoning } = this.parseResponse(text);

      return {
        score: verdict === 'yes' ? 1 : 0,
        verdict,
        reasoning: this.config.includeReasoning ? reasoning : undefined,
        metadata: {
          judgeModel: this.config.judgeModel,
          evaluatedAt: new Date().toISOString(),
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        // Handle rate limiting
        if (error.message.includes('rate limit')) {
          throw this.createError('RATE_LIMIT', 'Rate limit exceeded', error);
        }

        // Handle API errors
        if (error.message.includes('API')) {
          throw this.createError('API_ERROR', 'OpenAI API error', error);
        }
      }

      throw this.createError('API_ERROR', 'Unknown error', error);
    }
  }

  /**
   * Build the evaluation prompt following LongMemEval format
   */
  private buildPrompt(
    question: string,
    goldAnswer: string,
    modelAnswer: string
  ): string {
    return `${this.config.customPrompt}

Question: ${question}

Correct Answer: ${goldAnswer}

Model Response: ${modelAnswer}

Please respond with either "yes" or "no", followed by a brief explanation of your reasoning.`;
  }

  /**
   * Parse the judge model's response
   */
  private parseResponse(text: string): {
    verdict: 'yes' | 'no';
    reasoning: string;
  } {
    const normalized = text.toLowerCase().trim();

    // Extract verdict (first word should be yes/no)
    const firstWord = normalized.split(/[\s\n]/)[0];

    let verdict: 'yes' | 'no';
    if (firstWord === 'yes' || normalized.startsWith('yes')) {
      verdict = 'yes';
    } else if (firstWord === 'no' || normalized.startsWith('no')) {
      verdict = 'no';
    } else {
      throw this.createError(
        'INVALID_VERDICT',
        `Invalid verdict in response: ${text}`
      );
    }

    // Extract reasoning (everything after the verdict)
    const reasoning = text
      .replace(/^(yes|no)[,.:;]?\s*/i, '')
      .trim();

    return { verdict, reasoning };
  }

  /**
   * Create a typed error
   */
  private createError(
    code: LLMJudgeError['code'],
    message: string,
    cause?: unknown
  ): LLMJudgeError {
    return new LLMJudgeError(message, code, cause);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a default LLM judge scorer instance
 */
export function createLLMJudgeScorer(
  config?: Partial<LLMJudgeScorerConfig>
): LLMJudgeScorer {
  return new OpenAIJudgeScorer(config);
}

/**
 * Convenience function to evaluate an answer directly
 */
export async function evaluateWithLLMJudge(
  question: string,
  goldAnswer: string,
  modelAnswer: string
): Promise<LLMJudgeResult> {
  const scorer = createLLMJudgeScorer();
  return scorer.evaluateAnswer(question, goldAnswer, modelAnswer);
}
