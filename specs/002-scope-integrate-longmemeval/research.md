# Research: LongMemEval Integration

**Date**: 2025-10-02
**Feature**: LongMemEval Integration for Memory-Augmented Chatbot Testing

## Research Questions

### 1. LongMemEval Dataset Format and Structure

**Decision**: Use LongMemEval JSON format with schema defined by GitHub repository

**Rationale**:
The LongMemEval dataset (ICLR 2025) is a benchmark for testing long-term interactive memory in chat assistants. The dataset is available in JSON format from the official GitHub repository (https://github.com/xiaowu0162/LongMemEval) and HuggingFace.

**Dataset Structure**:
```typescript
interface LongMemEvalQuestion {
  question_id: string;                    // Unique identifier
  question_type: string;                  // e.g., "single-session-user", "temporal-reasoning"
  question: string;                       // The evaluation question text
  answer: string;                         // Gold standard answer
  question_date: string;                  // Timestamp of question
  haystack_session_ids: string[];         // List of relevant session IDs
  haystack_dates: string[];               // Timestamps for each session
  haystack_sessions: Session[][];         // Multi-dimensional array of sessions
}

interface Session {
  role: "user" | "assistant";             // Turn role
  content: string;                        // Turn content/message
  has_answer?: boolean;                   // Optional: marks turns with key evidence
}
```

**Dataset Variants**:
- `longmemeval_s.json`: Small (~40 history sessions, ~115k tokens)
- `longmemeval_m.json`: Medium (~500 sessions)
- `longmemeval_oracle.json`: Only evidence sessions

**Question Types**:
1. Single-session interactions
2. Multi-session reasoning
3. Temporal reasoning
4. Knowledge updates
5. Abstention questions (_abs suffix)

**Total**: 500 evaluation instances

**Alternatives Considered**:
- Creating custom synthetic dataset: Rejected due to lack of standardization and difficulty in validation
- Using other memory benchmarks (MemoryEval, LongBench): Rejected as LongMemEval is specifically designed for chat assistant long-term memory

### 2. Evaluation Question Identification

**Decision**: Use question_id and question_type fields to identify eval questions, not an `is_eval` field in turns

**Rationale**:
Unlike initially assumed in the specification, LongMemEval does not mark individual conversation turns with an `is_eval: true` flag. Instead:
- Evaluation questions are top-level entries in the dataset with a unique `question_id`
- The `haystack_sessions` contain historical context (user/assistant turns to replay)
- The `question` field contains the evaluation query itself
- The evaluation process involves: (1) replaying all haystack_sessions to build context, (2) then asking the `question` as a new user turn, (3) comparing the assistant's response to the gold `answer`

**Implementation Impact**:
The conversation replay logic will need to:
1. Iterate through each LongMemEval question entry
2. Replay all turns from `haystack_sessions` (potentially across multiple sessions)
3. After replay completes, inject the `question` as a final user turn
4. Capture the real assistant response (not mocked)
5. Score against the gold `answer`

**Alternatives Considered**:
- Modifying the dataset to add `is_eval` flags: Rejected to maintain dataset integrity and allow future dataset updates
- Using turn position heuristics: Rejected as unreliable and fragile

### 3. F1 Token Overlap Computation

**Decision**: Implement custom F1 token overlap scorer using simple whitespace tokenization

**Rationale**:
F1 score for token overlap is a standard metric in NLP QA tasks. It measures the harmonic mean of precision and recall at the token level:
- **Precision**: tp / (tp + fp) where tp = tokens in both pred and gold, fp = tokens in pred but not gold
- **Recall**: tp / (tp + fn) where fn = tokens in gold but not pred
- **F1**: 2 * (precision * recall) / (precision + recall)

**Implementation**:
```typescript
function computeF1TokenOverlap(prediction: string, goldAnswer: string): number {
  const predTokens = new Set(prediction.toLowerCase().trim().split(/\s+/));
  const goldTokens = new Set(goldAnswer.toLowerCase().trim().split(/\s+/));

  const tp = intersection(predTokens, goldTokens).size;
  const fp = difference(predTokens, goldTokens).size;
  const fn = difference(goldTokens, predTokens).size;

  if (tp === 0) return 0;

  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return 2 * (precision * recall) / (precision + recall);
}
```

**Alternatives Considered**:
- **wink-nlp** (npm package): Comprehensive NLP library with tokenization. Rejected due to overhead for simple whitespace tokenization needs.
- **natural** (npm package): General NLP library with stemming and tokenization. Rejected as F1 calculation is simple enough to implement directly.
- **node-nlp**: Similar to natural, rejected for same reasons.
- **BERTScore or semantic similarity**: Rejected as spec explicitly requires F1 token overlap, not semantic similarity.

**Dependencies**: None (custom implementation)

### 4. LLM Provider Mocking Strategy for Mastra Agents

**Decision**: Use provider-level mocking with MockLanguageModelV2 from AI SDK

**Rationale**:
The spec requires mocking assistant responses from the dataset for all non-evaluation turns, but allowing the real assistant pipeline to generate responses at evaluation questions. **CRITICAL**: Mocking must not bypass Mastra's agent or memory system - only the LLM provider should be mocked. This ensures Mastra's memory system creates and maintains conversation context during haystack replay.

**Approach**:
```typescript
// lib/eval/chat-service.ts
import { MockLanguageModelV2 } from 'ai/test';
import { customProvider } from '@/lib/ai/providers';
import { Mastra } from '@mastra/core';

interface ChatService {
  generateResponse(messages: ChatMessage[], chatId: string): Promise<string>;
}

class ProductionChatService implements ChatService {
  async generateResponse(messages: ChatMessage[], chatId: string): Promise<string> {
    // Call Mastra agent directly with real Gemini provider
    return await mastra.agents.assistantAgent.generate({ messages, chatId });
  }
}

class MockedChatService implements ChatService {
  private mockedMastra: Mastra;

  constructor(mockResponses: Map<number, string>) {
    // Create mock provider that returns dataset responses
    const mockProvider = customProvider({
      languageModels: {
        'chat-model': new MockLanguageModelV2({
          doGenerate: async () => ({
            text: mockResponses.get(currentTurnIndex),
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 20 },
          }),
        }),
      },
    });

    // Create Mastra instance with mocked provider
    // Same configuration as production, just different LLM provider
    this.mockedMastra = new Mastra({
      agents: {
        assistantAgent: {
          model: mockProvider.languageModel('chat-model'),
          // Same memory config as production
        },
      },
    });
  }

  async generateResponse(messages: ChatMessage[], chatId: string): Promise<string> {
    // STILL calls Mastra agent - just with mocked LLM provider
    // This ensures memory is created and maintained normally
    return await this.mockedMastra.agents.assistantAgent.generate({ messages, chatId });
  }
}
```

**Key Difference from Initial Approach**:
- ❌ OLD: MockedChatService returns strings directly → No Mastra call → No memory created
- ✅ NEW: MockedChatService calls Mastra with mock provider → Memory works normally

**Alternatives Considered**:
- **Returning mock strings without calling Mastra**: Rejected as it prevents memory creation (falsifies evaluation)
- **Global mocking with jest/sinon**: Rejected as this is runtime code, not test code
- **Middleware interception**: Rejected as Next.js route handler is not used (direct Mastra calls)
- **Monkey-patching Mastra agent**: Rejected as violates spec requirement to not modify Mastra core

**Dependencies**: MockLanguageModelV2 from `ai/test` (already used in codebase at `lib/ai/models.test.ts`)

### 5. Deterministic Seeding for Mastra Agents

**Decision**: Set explicit seed via Mastra model configuration if supported; otherwise document non-determinism

**Rationale**:
Reproducibility requires controlling randomness in LLM generation. Mastra uses the AI SDK underneath, which supports model parameters.

**Approach**:
```typescript
// Mastra agent configuration
const assistantAgent = new Agent({
  name: 'assistant',
  model: {
    provider: 'openai',
    name: 'gpt-4',
    toolChoice: 'auto',
    // Add seed parameter for deterministic generation
    seed: process.env.LONGMEMEVAL_SEED ? parseInt(process.env.LONGMEMEVAL_SEED) : undefined,
  },
  // ...
});
```

**Note**: Seed support depends on the underlying LLM provider:
- OpenAI GPT-4/GPT-3.5: Supports `seed` parameter (beta)
- Other providers: May not support deterministic generation

**Fallback**: If seed is not supported, document in evaluation results that reproducibility is not guaranteed for the LLM generation portion. F1 scoring itself will be deterministic.

**Alternatives Considered**:
- **Mocking LLM responses entirely**: Rejected as defeats the purpose of evaluating the real system
- **Recording and replaying LLM outputs**: Considered but adds complexity; acceptable fallback if seed doesn't work

**Dependencies**: May need to verify Mastra/AI SDK seed support

### 6. CLI Framework for TypeScript

**Decision**: Use built-in Node.js process.argv parsing (no framework)

**Rationale**:
The CLI requirements are minimal:
- Single command: `pnpm run eval-longmemeval`
- Optional arguments: dataset path, seed, output directory
- No subcommands, no complex option parsing needed

**Implementation**:
```typescript
// scripts/eval-longmemeval.ts
const args = process.argv.slice(2);
const datasetPath = args[0] || 'data/longmemeval_s.json';
const seed = args[1] ? parseInt(args[1]) : undefined;
const outputDir = args[2] || '.';

console.log(`Running LongMemEval evaluation...`);
console.log(`Dataset: ${datasetPath}`);
console.log(`Seed: ${seed ?? 'none (non-deterministic)'}`);
// ... run evaluation
```

**Script invocation**:
```bash
# package.json
"scripts": {
  "eval:longmemeval": "tsx scripts/eval-longmemeval.ts"
}

# Usage
pnpm run eval:longmemeval data/longmemeval_m.json 42 ./results
```

**Alternatives Considered**:
- **commander** (218M weekly downloads): Full-featured CLI framework with subcommands, help generation, option parsing. Rejected as overkill for single-script use case.
- **yargs** (120M downloads): Feature-rich with command chaining, middleware. Rejected as unnecessarily complex.
- **minimist** (79M downloads): Lightweight parsing only. Rejected as even basic parsing is trivial with native Node.js.
- **cmd-ts**: TypeScript-first CLI framework. Rejected due to added dependency for minimal value.

**Dependencies**: None (using tsx for execution, which is already a dev dependency)

### 7. Conversation Replay Patterns

**Decision**: Direct Mastra agent invocation with ChatService abstraction for mocking control

**Rationale**:
Replaying conversations requires:
1. Creating a unique Chat entity in the database for each LongMemEval question
2. Sequentially processing conversation turns (both user and assistant)
3. Mocking LLM responses during haystack replay (using provider-level mocking)
4. Capturing real LLM responses at evaluation questions
5. Maintaining conversation state across session boundaries

**Approach**:
```typescript
// lib/eval/conversation-replayer.ts
async function replayConversation(
  question: LongMemEvalQuestion,
  chatService: ChatService
): Promise<EvaluationResult> {
  // 1. Create unique Chat entity directly via Drizzle ORM
  const chatId = await createEvalChat(question.question_id);

  // 2. Replay haystack sessions with mocked LLM provider
  const mockResponses = extractMockResponses(question.haystack_sessions);
  const mockedService = new MockedChatService(mockResponses);

  const conversationHistory: ChatMessage[] = [];
  for (const session of question.haystack_sessions) {
    for (const turn of session) {
      if (turn.role === 'user') {
        conversationHistory.push({ role: 'user', content: turn.content });
        // Call Mastra with mocked LLM provider
        const response = await mockedService.generateResponse(conversationHistory, chatId);
        conversationHistory.push({ role: 'assistant', content: response });
      }
    }
  }

  // 3. Ask the evaluation question with real agent
  conversationHistory.push({ role: 'user', content: question.question });
  const realService = new ProductionChatService();
  const modelAnswer = await realService.generateResponse(conversationHistory, chatId);

  // 4. Score the answer
  const score = computeF1TokenOverlap(modelAnswer, question.answer);

  return {
    question_id: question.question_id,
    question_type: question.question_type,
    question: question.question,
    answer: question.answer,
    model_answer: modelAnswer,
    score,
  };
}
```

**State Management**:
- Each LongMemEval question gets a unique Chat entity in the database (via Drizzle ORM)
- Chat entity ID is passed through all Mastra agent calls to maintain context
- Mastra's PostgresStore automatically persists memory across turns
- Session boundaries in the dataset are informational only; Mastra maintains continuous context
- **No HTTP layer involved** - All operations are direct function calls

**Alternatives Considered**:
- **HTTP calls to POST /api/chat**: Rejected due to complexity (server must be running, authentication, port configuration)
- **Browser automation (Playwright)**: Rejected as adds complexity and requires UI when direct calls are simpler
- **In-memory chat state**: Rejected as violates constraint to use production database

**Dependencies**: None (uses existing Drizzle ORM for database access and Mastra for agent invocation)

## Summary of Key Decisions

| Research Area | Decision | Key Justification |
|---------------|----------|-------------------|
| Dataset Format | LongMemEval JSON from GitHub | Official ICLR 2025 benchmark, 500 eval instances |
| Eval Question Identification | Top-level question entries, not turn flags | Dataset structure uses question_id, not per-turn markers |
| F1 Scoring | Custom implementation with whitespace tokenization | Simple algorithm, no external dependencies needed |
| LLM Provider Mocking | Provider-level mocking with MockLanguageModelV2 | Preserves Mastra memory creation, mocks only LLM provider |
| Deterministic Seeding | Model seed parameter via Mastra/AI SDK | Supported by OpenAI models (beta), fallback: document non-determinism |
| CLI Framework | Native Node.js process.argv | No complex parsing needed, zero dependencies |
| Conversation Replay | Direct Mastra agent calls with ChatService abstraction | No HTTP layer, direct function calls, leverages Mastra PostgresStore |

## Dependencies to Add

None required. All functionality can be implemented with existing dependencies:
- Existing: TypeScript, tsx, @mastra/*, Drizzle ORM, Next.js, node-fetch (or native fetch)
- New: None

## Environment Variables to Add

```env
# .env.example additions
# Output directory for evaluation results (optional, defaults to current directory)
LONGMEMEVAL_OUTPUT_DIR=./eval-results
```

**Note**: Removed `LONGMEMEVAL_DATASET_PATH` (now specified via CLI `--dataset` flag) and `LONGMEMEVAL_SEED` (Gemini 2.5 Flash/Pro models don't support deterministic seed)

## Next Steps

Proceed to Phase 1: Design & Contracts
- Define EvaluationRun and EvaluationResult entities in data-model.md
- Create TypeScript interface contracts for dataset loader, replayer, scorer
- Generate failing contract tests for each component
- Create quickstart.md with step-by-step evaluation workflow
- Update CLAUDE.md with new lib/eval/ structure
