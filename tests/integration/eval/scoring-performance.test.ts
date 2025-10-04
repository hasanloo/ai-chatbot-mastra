/**
 * Performance Test: F1 Scoring
 *
 * Verifies that F1 scoring completes within the performance target (<100ms per computation).
 */

import { describe, it, expect } from '@jest/globals';
import { createF1Scorer } from '@/lib/eval/scoring';

describe('F1 Scoring Performance Test', () => {
  const scorer = createF1Scorer();

  it('should compute F1 for 1000 random prediction/gold pairs within performance target', () => {
    const numPairs = 1000;
    const targetAvgMs = 100; // Per NFR-003 in spec

    // Generate random prediction/gold answer pairs
    const pairs: Array<{ prediction: string; goldAnswer: string }> = [];
    for (let i = 0; i < numPairs; i++) {
      const wordCount = Math.floor(Math.random() * 20) + 5; // 5-25 words
      const words = Array.from({ length: wordCount }, (_, idx) =>
        `word${Math.floor(Math.random() * 100)}`
      );

      const prediction = words.slice(0, Math.floor(wordCount * 0.7)).join(' ');
      const goldAnswer = words.slice(Math.floor(wordCount * 0.3)).join(' ');

      pairs.push({ prediction, goldAnswer });
    }

    // Measure time to compute F1 for all pairs
    const startTime = performance.now();

    for (const { prediction, goldAnswer } of pairs) {
      scorer.computeF1(prediction, goldAnswer);
    }

    const endTime = performance.now();
    const totalMs = endTime - startTime;
    const avgMs = totalMs / numPairs;

    console.log(`Total time for ${numPairs} computations: ${totalMs.toFixed(2)}ms`);
    console.log(`Average time per computation: ${avgMs.toFixed(4)}ms`);

    // Assert average time is well within target
    expect(avgMs).toBeLessThan(targetAvgMs);

    // Additional assertion: should be very fast (< 1ms per computation for simple tokenization)
    expect(avgMs).toBeLessThan(1);
  });

  it('should handle edge cases quickly', () => {
    const startTime = performance.now();

    // Test various edge cases
    scorer.computeF1('', ''); // Both empty
    scorer.computeF1('hello', ''); // Gold empty
    scorer.computeF1('', 'hello'); // Prediction empty
    scorer.computeF1('identical', 'identical'); // Perfect match
    scorer.computeF1('completely different', 'totally unrelated'); // No overlap

    const endTime = performance.now();
    const totalMs = endTime - startTime;

    // Edge cases should be extremely fast
    expect(totalMs).toBeLessThan(10);
  });
});
