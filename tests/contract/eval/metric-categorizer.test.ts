/**
 * Contract Tests: Metric Categorizer
 *
 * Tests for the metric categorization logic that maps LongMemEval questions
 * to the 5 core memory abilities (IE, MR, KU, TR, ABS).
 */

import { describe, it, expect } from '@jest/globals';
import {
  categorizeQuestion,
  getMetricName,
  getMetricDescription,
  LongMemEvalMetric,
} from '@/lib/eval/metric-categorizer';
import type { LongMemEvalQuestion } from '@/specs/002-scope-integrate-longmemeval/contracts/dataset-loader.contract';

describe('Metric Categorizer Contract Tests', () => {
  describe('categorizeQuestion()', () => {
    it('should categorize abstention questions (with _abs suffix) as ABS', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test123_abs',
        question_type: 'single-session-user',
        question: 'What is my favorite color?',
        answer: 'I don\'t know',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.ABSTENTION);
    });

    it('should categorize multi-session questions as MR', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test456',
        question_type: 'multi-session',
        question: 'How many times did I mention coffee?',
        answer: '3 times',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.MULTI_SESSION_REASONING);
    });

    it('should categorize knowledge-update questions as KU', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test789',
        question_type: 'knowledge-update',
        question: 'What is my current job?',
        answer: 'Software Engineer',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.KNOWLEDGE_UPDATES);
    });

    it('should categorize temporal-reasoning questions as TR', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test101',
        question_type: 'temporal-reasoning',
        question: 'When did I last visit the gym?',
        answer: 'Last Tuesday',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.TEMPORAL_REASONING);
    });

    it('should categorize single-session-user questions as IE', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test202',
        question_type: 'single-session-user',
        question: 'What degree did I graduate with?',
        answer: 'Business Administration',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.INFORMATION_EXTRACTION);
    });

    it('should categorize single-session-assistant questions as IE', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test303',
        question_type: 'single-session-assistant',
        question: 'What recipe did you suggest?',
        answer: 'Spaghetti Carbonara',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.INFORMATION_EXTRACTION);
    });

    it('should categorize single-session-preference questions as IE', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test404',
        question_type: 'single-session-preference',
        question: 'Which movie did I prefer?',
        answer: 'The Matrix',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.INFORMATION_EXTRACTION);
    });

    it('should prioritize abstention (_abs suffix) over base question type', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test505_abs',
        question_type: 'multi-session',
        question: 'How many pets do I have?',
        answer: 'I don\'t know',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.ABSTENTION);
    });

    it('should default to IE for unknown question types', () => {
      const question: LongMemEvalQuestion = {
        question_id: 'test606',
        question_type: 'unknown-type' as any,
        question: 'Test question',
        answer: 'Test answer',
        question_date: '2023/05/30 (Tue) 23:40',
        haystack_session_ids: [],
        haystack_dates: [],
        haystack_sessions: [],
      };

      const metric = categorizeQuestion(question);
      expect(metric).toBe(LongMemEvalMetric.INFORMATION_EXTRACTION);
    });
  });

  describe('getMetricName()', () => {
    it('should return correct name for each metric', () => {
      expect(getMetricName(LongMemEvalMetric.INFORMATION_EXTRACTION)).toBe(
        'Information Extraction',
      );
      expect(getMetricName(LongMemEvalMetric.MULTI_SESSION_REASONING)).toBe(
        'Multi-Session Reasoning',
      );
      expect(getMetricName(LongMemEvalMetric.KNOWLEDGE_UPDATES)).toBe(
        'Knowledge Updates',
      );
      expect(getMetricName(LongMemEvalMetric.TEMPORAL_REASONING)).toBe(
        'Temporal Reasoning',
      );
      expect(getMetricName(LongMemEvalMetric.ABSTENTION)).toBe('Abstention');
    });
  });

  describe('getMetricDescription()', () => {
    it('should return non-empty description for each metric', () => {
      for (const metric of Object.values(LongMemEvalMetric)) {
        const description = getMetricDescription(metric);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(10);
      }
    });

    it('should return correct description for IE', () => {
      const description = getMetricDescription(
        LongMemEvalMetric.INFORMATION_EXTRACTION,
      );
      expect(description.toLowerCase()).toContain('recall');
      expect(description.toLowerCase()).toContain('information');
    });

    it('should return correct description for ABS', () => {
      const description = getMetricDescription(
        LongMemEvalMetric.ABSTENTION,
      );
      expect(description.toLowerCase()).toContain('unknown');
    });
  });
});
