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

### 4. Response Mocking Strategy for Next.js Route Handlers

**Decision**: Use dependency injection with a ChatService abstraction layer

**Rationale**:
The spec requires mocking assistant responses from the dataset for all non-evaluation turns, but allowing the real assistant pipeline to generate responses at evaluation questions. This requires intercepting the chat API logic.

**Approach**:
```typescript
// lib/eval/chat-service.ts
interface ChatService {
  generateResponse(message: string, chatId: string): Promise<string>;
}

class ProductionChatService implements ChatService {
  async generateResponse(message: string, chatId: string): Promise<string> {
    // Existing Mastra agent invocation logic
    return await mastra.agents.assistantAgent.generate(message, { chatId });
  }
}

class MockedChatService implements ChatService {
  constructor(private mockResponses: Map<number, string>) {}

  async generateResponse(message: string, chatId: string): Promise<string> {
    const turnIndex = this.getTurnIndex(chatId);
    return this.mockResponses.get(turnIndex) ??
      throw new Error('No mock response for turn');
  }
}

// Evaluation runner uses MockedChatService for haystack replay
// then switches to ProductionChatService for the eval question
```

**Alternatives Considered**:
- **Global mocking with jest/sinon**: Rejected as this is runtime code, not test code
- **Middleware interception**: Rejected as Next.js route handler middleware is complex to inject
- **Environment-based switching**: Rejected as too coarse-grained and error-prone
- **Monkey-patching Mastra agent**: Rejected as violates spec requirement to not modify Mastra core

**Dependencies**: None (custom abstraction)

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

**Decision**: Direct HTTP client invocation of POST /api/chat with manual state management

**Rationale**:
Replaying conversations requires:
1. Creating a unique Chat entity in the database for each LongMemEval question
2. Sequentially sending user messages via POST /api/chat
3. Capturing and storing assistant responses (mocked or real)
4. Maintaining conversation state across session boundaries

**Approach**:
```typescript
// lib/eval/conversation-replayer.ts
async function replayConversation(
  question: LongMemEvalQuestion,
  chatService: ChatService
): Promise<EvaluationResult> {
  // 1. Create unique Chat entity for this evaluation
  const chatId = await createEvalChat(question.question_id);

  // 2. Replay haystack sessions with mocked responses
  const mockResponses = extractMockResponses(question.haystack_sessions);
  const mockedService = new MockedChatService(mockResponses);

  for (const session of question.haystack_sessions) {
    for (const turn of session) {
      if (turn.role === 'user') {
        await mockedService.generateResponse(turn.content, chatId);
      }
      // Assistant turns are already in mockResponses
    }
  }

  // 3. Ask the evaluation question with real agent
  const realService = new ProductionChatService();
  const modelAnswer = await realService.generateResponse(
    question.question,
    chatId
  );

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
- Each LongMemEval question gets a unique Chat entity in the database
- Chat entity ID is passed through all message exchanges to maintain context
- Mastra's PostgresStore automatically persists memory across turns
- Session boundaries in the dataset are informational only; Mastra maintains continuous context

**Alternatives Considered**:
- **Browser automation (Playwright)**: Rejected as adds complexity and requires UI when API is sufficient
- **In-memory chat state**: Rejected as violates constraint to use production database
- **Direct Mastra API calls bypassing /api/chat**: Rejected as doesn't test the real production endpoint

**Dependencies**: node-fetch or native fetch for HTTP requests to /api/chat

## Summary of Key Decisions

| Research Area | Decision | Key Justification |
|---------------|----------|-------------------|
| Dataset Format | LongMemEval JSON from GitHub | Official ICLR 2025 benchmark, 500 eval instances |
| Eval Question Identification | Top-level question entries, not turn flags | Dataset structure uses question_id, not per-turn markers |
| F1 Scoring | Custom implementation with whitespace tokenization | Simple algorithm, no external dependencies needed |
| Response Mocking | Dependency injection with ChatService abstraction | Clean, testable, doesn't modify Mastra core |
| Deterministic Seeding | Model seed parameter via Mastra/AI SDK | Supported by OpenAI models (beta), fallback: document non-determinism |
| CLI Framework | Native Node.js process.argv | No complex parsing needed, zero dependencies |
| Conversation Replay | Direct /api/chat invocation with DB state | Tests real production endpoint, leverages Mastra PostgresStore |

## Dependencies to Add

None required. All functionality can be implemented with existing dependencies:
- Existing: TypeScript, tsx, @mastra/*, Drizzle ORM, Next.js, node-fetch (or native fetch)
- New: None

## Environment Variables to Add

```env
# .env.example additions
# LongMemEval dataset path (optional, defaults to data/longmemeval_s.json)
LONGMEMEVAL_DATASET_PATH=data/longmemeval_s.json

# Seed for deterministic LLM generation (optional, leave empty for non-deterministic)
LONGMEMEVAL_SEED=42

# Output directory for evaluation results (optional, defaults to current directory)
LONGMEMEVAL_OUTPUT_DIR=./eval-results
```

## Next Steps

Proceed to Phase 1: Design & Contracts
- Define EvaluationRun and EvaluationResult entities in data-model.md
- Create TypeScript interface contracts for dataset loader, replayer, scorer
- Generate failing contract tests for each component
- Create quickstart.md with step-by-step evaluation workflow
- Update CLAUDE.md with new lib/eval/ structure
