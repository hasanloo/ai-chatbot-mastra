# Tasks: LongMemEval Integration for Memory-Augmented Chatbot Testing

**Input**: Design documents from `/Users/hasan/Development/ai-chatbot-mastra/specs/002-scope-integrate-longmemeval/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Project uses **Web application (Next.js)** structure with:
- Core logic: `lib/eval/` (new)
- Scripts: `scripts/` (new)
- Database: `lib/db/schema.ts` (modify), `lib/db/migrations/` (new)
- Tests: `tests/contract/eval/`, `tests/integration/eval/`, `tests/e2e/eval/` (all new)

---

## Phase 3.1: Setup

### T001: Create evaluation directory structure
**Description**: Create new directories for LongMemEval integration
**Files**:
- `mkdir -p lib/eval`
- `mkdir -p scripts`
- `mkdir -p tests/contract/eval`
- `mkdir -p tests/integration/eval`
- `mkdir -p tests/e2e/eval`
- `mkdir -p data`

**Validation**: All directories exist and are empty

---

### T002: Add environment variables documentation
**Description**: Document new environment variables in `.env.example`
**File**: `.env.example`
**Changes**:
```bash
# Add these lines:
# LongMemEval Evaluation Configuration (optional)
LONGMEMEVAL_OUTPUT_DIR=./eval-results
```

**Validation**: `.env.example` contains new variable with comment

**Note**: Removed LONGMEMEVAL_DATASET_PATH (using CLI selection) and LONGMEMEVAL_SEED (Gemini models don't support seed parameter)

---

### T003: Create database schema migration for evaluation tables
**Description**: Add EvaluationRun and EvaluationResult tables to database schema
**File**: `lib/db/schema.ts`
**Changes**:
- Add `evaluationRun` table definition (id, datasetName, datasetPath, totalQuestions, completedQuestions, failedQuestions, averageF1Score, seed, startedAt, completedAt, outputFilePath, userId)
- Add `evaluationResult` table definition (id, evaluationRunId, questionId, questionType, question, goldAnswer, modelAnswer, f1Score, chatId, errorMessage, evaluatedAt)
- Add TypeScript types: `EvaluationRun`, `EvaluationResult`
- Add foreign key references and cascade deletes

**Reference**: See data-model.md for complete schema

**Validation**:
```bash
pnpm db:generate  # Should generate migration SQL
pnpm db:migrate   # Should apply migration successfully
pnpm db:studio    # Should show new tables in UI
```

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T004 [P]: Contract test for dataset loader
**Description**: Write contract tests for DatasetLoader interface
**File**: `tests/contract/eval/dataset-loader.test.ts`
**Tests**:
1. `load()` successfully loads valid LongMemEval JSON file
2. `load()` throws DatasetLoadError for non-existent file
3. `load()` throws DatasetLoadError for malformed JSON
4. `load()` throws DatasetValidationError for invalid schema (missing required fields)
5. `validateQuestion()` returns true for valid question object
6. `validateQuestion()` returns false for invalid question (missing fields, wrong types)
7. `getDatasetMetadata()` returns correct metadata without loading full dataset

**Imports**: Import from `@/specs/002-scope-integrate-longmemeval/contracts/dataset-loader.contract`

**Validation**: Tests fail with "Module not found" or "Function not implemented"

---

### T005 [P]: Contract test for F1 scorer
**Description**: Write contract tests for F1Scorer interface
**File**: `tests/contract/eval/scoring.test.ts`
**Tests**:
1. `computeF1()` returns 1.0 for identical strings
2. `computeF1()` returns 0.0 for completely different strings
3. `computeF1()` returns 0.0 when prediction is empty (gold not empty)
4. `computeF1()` returns 0.0 when gold is empty (prediction not empty)
5. `computeF1()` returns 1.0 when both are empty
6. `computeF1()` computes correct F1 for partial overlap ("hello world" vs "world hello")
7. `computeF1()` is case-insensitive ("Hello" vs "hello" = 1.0)
8. `computeDetailedScore()` returns correct precision, recall, F1, and token counts
9. `tokenize()` splits on whitespace correctly

**Imports**: Import from `@/specs/002-scope-integrate-longmemeval/contracts/scoring.contract`

**Validation**: Tests fail with "Module not found" or "Function not implemented"

---

### T006 [P]: Contract test for conversation replayer
**Description**: Write contract tests for ConversationReplayer interface
**File**: `tests/contract/eval/conversation-replayer.test.ts`
**Tests**:
1. `createEvaluationChat()` creates a new Chat entity in database
2. `replaySession()` sends all user/assistant turns sequentially
3. `sendRealMessage()` calls real Mastra agent and returns response
4. `replayAndEvaluate()` completes full evaluation flow (replay + eval question + scoring)
5. Mocked responses are used during haystack replay
6. Real response is captured at evaluation question
7. Error handling: ReplayError thrown with correct stage on failure

**Imports**: Import from `@/specs/002-scope-integrate-longmemeval/contracts/conversation-replayer.contract`

**Note**: Tests will need test database and mocked Mastra agent

**Validation**: Tests fail with "Module not found" or "Function not implemented"

---

### T007 [P]: Contract test for evaluation runner
**Description**: Write contract tests for EvaluationRunner interface
**File**: `tests/contract/eval/evaluation-runner.test.ts`
**Tests**:
1. `run()` loads dataset, evaluates all questions, generates output JSON
2. `run()` creates EvaluationRun database record
3. `run()` creates EvaluationResult records for each question
4. `run()` computes correct average F1 score
5. `run()` continues on errors (resilient mode per spec)
6. `run()` generates timestamped output filename correctly
7. `getProgress()` returns current evaluation status
8. `cancel()` stops evaluation gracefully after current question

**Imports**: Import from `@/specs/002-scope-integrate-longmemeval/contracts/evaluation-runner.contract`

**Validation**: Tests fail with "Module not found" or "Function not implemented"

---

### T008 [P]: Integration test for full evaluation workflow
**Description**: Write integration test for complete evaluation run (end-to-end without UI)
**File**: `tests/integration/eval/full-evaluation.test.ts`
**Test Scenario** (from quickstart.md):
1. Load small sample dataset (5 questions)
2. Run complete evaluation
3. Verify all 5 questions are evaluated
4. Verify average F1 score is computed
5. Verify output JSON file is created
6. Verify database records exist (EvaluationRun, EvaluationResult, Chat, Message_v2)
7. Verify error handling (inject 1 failing question, check errors array)

**Setup**: Create sample dataset file with 5 LongMemEval questions

**Validation**: Test fails because implementation doesn't exist

---

### T009 [P]: Integration test for multi-session memory retention
**Description**: Write integration test to verify memory is retained across session boundaries
**File**: `tests/integration/eval/multi-session-memory.test.ts`
**Test Scenario**:
1. Create a multi-session question (3 sessions with info spread across them)
2. Replay all sessions
3. Ask evaluation question that requires info from session 1
4. Verify model answer contains info from session 1 (F1 score > 0.5)

**Purpose**: Validates that Mastra memory maintains context across session breaks

**Validation**: Test fails because replayer not implemented

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T010 [P]: Implement F1 token overlap scorer
**Description**: Implement F1Scorer interface with whitespace tokenization
**File**: `lib/eval/scoring.ts`
**Interface**: `F1Scorer` from contracts/scoring.contract.ts
**Implementation**:
- `computeF1(prediction, goldAnswer): number` - Main F1 computation
- `computeDetailedScore(prediction, goldAnswer): DetailedF1Score` - Detailed breakdown
- `tokenize(text): string[]` - Whitespace tokenization with lowercase normalization

**Algorithm** (from research.md):
```typescript
function computeF1(prediction: string, goldAnswer: string): number {
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

**Edge Cases**: Handle BOTH_EMPTY (1.0), PREDICTION_EMPTY (0.0), GOLD_EMPTY (0.0), NO_OVERLAP (0.0)

**Validation**:
```bash
pnpm test tests/contract/eval/scoring.test.ts
# All tests should pass
```

---

### T011 [P]: Implement dataset loader
**Description**: Implement DatasetLoader interface for loading LongMemEval JSON files
**File**: `lib/eval/dataset-loader.ts`
**Interface**: `DatasetLoader` from contracts/dataset-loader.contract.ts
**Implementation**:
- `load(filePath): Promise<LongMemEvalQuestion[]>` - Load and validate dataset
- `validateQuestion(question): boolean` - Schema validation using type guards
- `getDatasetMetadata(filePath): Promise<DatasetMetadata>` - Lightweight metadata extraction

**Dependencies**: Use Node.js `fs.promises` for file reading, `JSON.parse` for parsing

**Validation Rules** (from contract):
- Allowed question types: single-session-user, multi-session, temporal-reasoning, knowledge-update, abstention
- Max sessions per question: 1000
- Max turns per session: 1000
- Min content length: 1

**Error Handling**:
- Throw `DatasetLoadError` for file read/parse errors
- Throw `DatasetValidationError` for schema validation failures

**Validation**:
```bash
pnpm test tests/contract/eval/dataset-loader.test.ts
# All tests should pass
```

---

### T012: Implement chat service abstraction layer with provider-level mocking
**Description**: Create ChatService interface with Production and Mocked implementations using provider-level mocking
**File**: `lib/eval/chat-service.ts`
**Interfaces**: `ChatService`, `ProductionChatService`, `MockedChatService` from conversation-replayer.contract.ts

**CRITICAL**: Mock only the LLM provider, NOT Mastra itself. This ensures Mastra's memory system works during haystack replay.

**Implementation**:

1. **ProductionChatService**:
   - `generateResponse(messages, chatId): Promise<string>` - Calls real Mastra agent with real LLM
   - Import `mastra` from `@/mastra/index`
   - Direct call: `await mastra.agents.assistantAgent.generate({ messages, chatId })`
   - **No HTTP calls** - Direct function invocation
   - Uses production Mastra instance with real Gemini provider
   - Manages conversation history internally
   - Saves messages to database via Drizzle ORM

2. **MockedChatService** (REVISED APPROACH):
   - Constructor takes `Map<number, string>` of turn index → mock response
   - `setMockResponse(turnIndex, response): void` - Set mock for specific turn
   - `generateResponse(messages, chatId): Promise<string>` - **CALLS Mastra with mocked LLM provider**
   - `reset(): void` - Reset turn counter
   - Internal turn counter increments on each call
   - **DOES call Mastra** - Uses MockLanguageModelV2 to mock only the LLM provider
   - Mastra's memory system works normally (stores messages, maintains context)

**Architecture with Provider Mocking**:
```typescript
import { MockLanguageModelV2 } from 'ai/test';
import { customProvider } from '@/lib/ai/providers';
import { Mastra } from '@mastra/core';

interface ChatService {
  generateResponse(messages: ChatMessage[], chatId: string): Promise<string>;
}

class ProductionChatService implements ChatService {
  async generateResponse(messages: ChatMessage[], chatId: string): Promise<string> {
    // Call Mastra agent directly with real provider
    const response = await mastra.agents.assistantAgent.generate({
      messages,
      chatId,
    });

    // Save messages to database
    await saveMessages({ chatId, messages: [...messages, response] });

    return response.content;
  }
}

class MockedChatService implements ChatService {
  private mockResponses: Map<number, string>;
  private currentTurnIndex: number = 0;
  private mockedMastra: Mastra;

  constructor(mockResponses: Map<number, string>) {
    this.mockResponses = mockResponses;

    // Create mock provider that returns dataset responses
    const mockProvider = customProvider({
      languageModels: {
        'chat-model': new MockLanguageModelV2({
          doGenerate: async () => {
            const responseText = this.mockResponses.get(this.currentTurnIndex) || '';
            this.currentTurnIndex++;

            return {
              rawCall: { rawPrompt: null, rawSettings: {} },
              finishReason: 'stop' as const,
              usage: { promptTokens: 10, completionTokens: 20 },
              text: responseText,
            };
          },
        }),
      },
    });

    // Create Mastra instance with mocked provider (same config as production, just different provider)
    this.mockedMastra = new Mastra({
      agents: {
        assistantAgent: {
          // Same agent config as production
          model: mockProvider.languageModel('chat-model'),
          // Same memory config, tools, etc.
        },
      },
    });
  }

  async generateResponse(messages: ChatMessage[], chatId: string): Promise<string> {
    // STILL calls Mastra agent - but with mocked LLM provider
    // This ensures memory is created and conversation context is maintained
    const response = await this.mockedMastra.agents.assistantAgent.generate({
      messages,
      chatId,
    });

    // Save messages to database (same as production)
    await saveMessages({ chatId, messages: [...messages, response] });

    return response.content;
  }

  reset(): void {
    this.currentTurnIndex = 0;
  }

  setMockResponse(turnIndex: number, response: string): void {
    this.mockResponses.set(turnIndex, response);
  }
}
```

**Key Differences from Original**:
- ❌ OLD: MockedChatService returns string directly → No Mastra call → No memory created
- ✅ NEW: MockedChatService calls Mastra with mock provider → Memory works normally

**Dependencies**:
- `MockLanguageModelV2` from `ai/test` (already used in `lib/ai/models.test.ts`)
- `customProvider` from `@/lib/ai/providers`
- Same Mastra agent configuration as production (to preserve memory behavior)

**Validation**:
```bash
# Unit test: Verify MockedChatService creates memory entries in database
pnpm test tests/contract/eval/chat-service.test.ts
```

**Note**: The mock provider approach preserves Mastra's memory system while controlling LLM outputs during haystack replay

---

### T013: Implement conversation replayer
**Description**: Implement ConversationReplayer interface for replaying conversations and evaluating questions
**File**: `lib/eval/conversation-replayer.ts`
**Interface**: `ConversationReplayer` from conversation-replayer.contract.ts
**Dependencies**:
- `lib/eval/chat-service.ts` (T012)
- `lib/eval/scoring.ts` (T010)
- `lib/db/queries.ts` (for creating Chat and saving Messages)

**Implementation**:

1. **createEvaluationChat(questionId): Promise<string>**:
   - Generate unique chat ID using `generateUUID()`
   - Create Chat entity in database directly (via `saveChat()`)
   - Use evaluation user ID (from `getOrCreateEvaluationUser()`)
   - Title: `LongMemEval: ${questionId}`
   - Visibility: 'private'
   - **No HTTP calls** - Direct database insertion

2. **replaySession(session, chatId): Promise<void>**:
   - Build conversation history from session turns
   - For each turn:
     - If user: add to messages array
     - If assistant: use MockedChatService to get predefined response from dataset
   - Save all messages to database via `saveMessages()`
   - **No LLM calls during replay** - All responses mocked

3. **sendRealMessage(message, chatId): Promise<string>**:
   - Get existing conversation history from database
   - Append new user message to history
   - Call ProductionChatService with full conversation history
   - Returns real assistant response from Mastra agent
   - **Direct Mastra call** - No HTTP

4. **replayAndEvaluate(question, config): Promise<EvaluationResult>**:
   - Create chat entity for this evaluation
   - Build mock response map from `question.haystack_sessions`
   - Replay all sessions with MockedChatService:
     - Flatten all sessions into conversation history
     - Save mocked messages to database
   - Ask evaluation question with ProductionChatService:
     - Load conversation history from database
     - Add evaluation question as user message
     - Get real response from Mastra agent
   - Compute F1 score against `question.answer`
   - Return EvaluationResult

**Architecture**:
```typescript
async replayAndEvaluate(question: LongMemEvalQuestion): Promise<EvaluationResult> {
  // 1. Create chat
  const chatId = await this.createEvaluationChat(question.question_id);

  // 2. Replay haystack sessions with mocked responses
  const mockedService = new MockedChatService(/* build from haystack_sessions */);
  for (const session of question.haystack_sessions) {
    await this.replaySession(session, chatId, mockedService);
  }

  // 3. Ask evaluation question with real agent
  const realService = new ProductionChatService();
  const modelAnswer = await this.sendRealMessage(question.question, chatId, realService);

  // 4. Score
  const f1Score = this.scorer.computeF1(modelAnswer, question.answer);

  return {
    questionId: question.question_id,
    modelAnswer,
    goldAnswer: question.answer,
    f1Score,
    chatId,
    // ...
  };
}
```

**No HTTP, No Auth Complexity**:
- All operations use direct function calls to Mastra
- Database access via Drizzle ORM
- No need for HTTP server to be running
- No session/cookie management

**Error Handling**: Wrap errors in `ReplayError` with appropriate stage

**Validation**:
```bash
pnpm test tests/contract/eval/conversation-replayer.test.ts
# All tests should pass
```

---

### T014: Implement evaluation runner
**Description**: Implement EvaluationRunner interface to orchestrate complete dataset evaluation
**File**: `lib/eval/evaluation-runner.ts`
**Interface**: `EvaluationRunner` from evaluation-runner.contract.ts
**Dependencies**:
- `lib/eval/dataset-loader.ts` (T011)
- `lib/eval/conversation-replayer.ts` (T013)
- `lib/db/schema.ts` (T003 - EvaluationRun, EvaluationResult tables)

**Implementation**:
1. **run(config): Promise<EvaluationRunResult>**:
   - Load dataset using DatasetLoader
   - If `config.subset` is provided, slice dataset to first N questions
   - Create EvaluationRun database record (startedAt, dataset metadata)
   - Create dedicated evaluation User (if not exists)
   - For each question in dataset (or subset):
     - Call replayer.replayAndEvaluate()
     - Create EvaluationResult database record
     - Update EvaluationRun counters (completedQuestions/failedQuestions)
     - Call onProgress callback if provided
     - Catch errors, log to errors array, continue (resilient mode)
   - Compute average F1 score
   - Update EvaluationRun (completedAt, averageF1Score)
   - Generate output JSON file with timestamp
   - Return EvaluationRunResult

2. **getProgress(): EvaluationProgress** - Return current status from internal state

3. **cancel(): Promise<void>** - Set cancellation flag, finish current question gracefully

**Config Interface**:
```typescript
interface EvaluationRunConfig {
  datasetPath: string;
  outputDir?: string;
  subset?: number;  // NEW: Run only first N questions
  onProgress?: (progress: EvaluationProgress) => void;
}
```

**Output File Generation**:
- Use `generateOutputFilename()` helper from contract
- Format: `longmemeval-results-YYYYMMDD-HHMMSS.json`
- Structure: EvaluationOutputFile interface

**Validation**:
```bash
pnpm test tests/contract/eval/evaluation-runner.test.ts
# All tests should pass
```

---

### T015: Implement CLI script entry point
**Description**: Create CLI script to run LongMemEval evaluation from command line
**File**: `scripts/eval-longmemeval.ts`
**Interface**: CLI with options for dataset selection and subset testing
**Dependencies**:
- `lib/eval/evaluation-runner.ts` (T014)

**CLI Arguments**:
- `--dataset <s|m|oracle>` - Select dataset variant (default: 's')
- `--subset <number>` - Run only first N questions (optional, for quick testing)
- `--output-dir <path>` - Output directory (default: current directory or LONGMEMEVAL_OUTPUT_DIR env)
- `--help` - Show usage instructions

**Implementation**:
```typescript
#!/usr/bin/env tsx

import { EvaluationRunner } from '@/lib/eval/evaluation-runner';

const args = process.argv.slice(2);

// Parse arguments
function parseArgs() {
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
      case '-d':
        const dataset = args[++i];
        if (!['s', 'm', 'oracle'].includes(dataset)) {
          console.error(`Invalid dataset: ${dataset}. Must be 's', 'm', or 'oracle'`);
          process.exit(1);
        }
        parsed.dataset = dataset as 's' | 'm' | 'oracle';
        break;
      case '--subset':
      case '-n':
        parsed.subset = parseInt(args[++i]);
        if (isNaN(parsed.subset) || parsed.subset < 1) {
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
  - Gemini models do not support deterministic seed (results may vary between runs)
  `);
  process.exit(0);
}

// Map dataset name to file path
const datasetPaths = {
  s: 'data/longmemeval_s.json',
  m: 'data/longmemeval_m.json',
  oracle: 'data/longmemeval_oracle.json',
};

const datasetPath = datasetPaths[config.dataset];

const runner = new EvaluationRunner();

console.log('[LongMemEval] Starting evaluation...');
console.log(`[LongMemEval] Dataset: ${config.dataset} (${datasetPath})`);
if (config.subset) {
  console.log(`[LongMemEval] Subset: First ${config.subset} questions only`);
}
console.log(`[LongMemEval] Output directory: ${config.outputDir}\n`);

runner.run({
  datasetPath,
  outputDir: config.outputDir,
  subset: config.subset,
  onProgress: (progress) => {
    if (progress.currentQuestion) {
      console.log(`[${progress.completedQuestions + 1}/${progress.totalQuestions}] Question ID: ${progress.currentQuestion.questionId}`);
    }
  }
}).then((result) => {
  console.log('\n[LongMemEval] Evaluation complete!');
  console.log(`[LongMemEval] Total questions: ${result.metadata.total_questions}`);
  console.log(`[LongMemEval] Completed: ${result.metadata.completed_questions}`);
  console.log(`[LongMemEval] Failed: ${result.metadata.failed_questions}`);
  console.log(`[LongMemEval] Average F1 Score: ${result.metadata.average_f1_score.toFixed(4)}`);
  console.log(`[LongMemEval] Output written to: ${result.outputFilePath}`);
  process.exit(0);
}).catch((error) => {
  console.error('[LongMemEval] Evaluation failed:', error.message);
  process.exit(1);
});
```

**Add to package.json**:
```json
"scripts": {
  "eval:longmemeval": "tsx scripts/eval-longmemeval.ts"
}
```

**Validation**:
```bash
pnpm run eval:longmemeval --help
# Should print usage instructions with dataset options
```

**Note**: Removed seed parameter as Gemini 2.5 Flash/Pro models do not support deterministic seed

---

## Phase 3.4: Integration

### T016: Add database queries for evaluation entities
**Description**: Create database query helpers for EvaluationRun and EvaluationResult
**File**: `lib/db/queries.ts` (append to existing file)
**Functions to add**:
```typescript
export async function createEvaluationRun(data: Omit<EvaluationRun, 'id'>): Promise<string>;
export async function updateEvaluationRun(id: string, data: Partial<EvaluationRun>): Promise<void>;
export async function createEvaluationResult(data: Omit<EvaluationResult, 'id'>): Promise<void>;
export async function getEvaluationRunById(id: string): Promise<EvaluationRun | null>;
export async function getEvaluationResultsByRunId(runId: string): Promise<EvaluationResult[]>;
```

**Dependencies**: Use Drizzle ORM with schema from T003

**Validation**: Write simple unit tests to verify CRUD operations

---

### T017: Create or retrieve dedicated evaluation user
**Description**: Add helper function to get/create a dedicated evaluation user in database
**File**: `lib/db/queries.ts` (append)
**Function**:
```typescript
export async function getOrCreateEvaluationUser(): Promise<User> {
  const email = 'evaluation@longmemeval.internal';

  // Try to find existing evaluation user
  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create new evaluation user
  const [newUser] = await db
    .insert(user)
    .values({
      email,
      password: null, // No password for system user
    })
    .returning();

  return newUser;
}
```

**Purpose**:
- Isolate evaluation data from production users
- All evaluation chats are owned by this dedicated user
- No authentication/session management needed (direct database access)

**Validation**: Test creates user on first call, returns same user on subsequent calls

---

---

## Phase 3.5: Polish

**Note**: Removed T018 (seed support) as Gemini 2.5 Flash/Pro models do not support deterministic seed parameter

### T018 [P]: End-to-end Playwright test for full evaluation
**Description**: Write E2E test that runs complete evaluation via CLI script
**File**: `tests/e2e/eval/full-evaluation.spec.ts`
**Test Scenario** (from quickstart.md):
1. Create sample dataset file (5 questions)
2. Run CLI script: `pnpm run eval:longmemeval <sample-file> 42`
3. Verify CLI exits with code 0 (success)
4. Verify output JSON file exists
5. Verify output JSON has correct structure (metadata, results, errors)
6. Verify database has EvaluationRun and EvaluationResult records
7. Clean up test data

**Purpose**: Validates entire system works end-to-end as user would run it

**Validation**:
```bash
pnpm test tests/e2e/eval/full-evaluation.spec.ts
# Test should pass
```

---

### T019 [P]: Add performance test for F1 scoring
**Description**: Verify F1 scoring completes within performance target
**File**: `tests/integration/eval/scoring-performance.test.ts`
**Test**:
- Generate 1000 random prediction/gold answer pairs
- Measure time to compute F1 for all pairs
- Assert average time per computation < 100ms (per NFR-003 in spec)

**Purpose**: Validates performance requirement from plan.md

**Validation**: Test passes with average < 100ms

---

### T020 [P]: Update CLAUDE.md with evaluation workflow
**Description**: Document how to run evaluations in CLAUDE.md
**File**: `CLAUDE.md` (already updated by Phase 1, verify completeness)
**Section to add** (if not present):
```markdown
### LongMemEval Integration

Run memory evaluation benchmarks:
- Dataset: Download from https://github.com/xiaowu0162/LongMemEval
- Run: `pnpm run eval:longmemeval data/longmemeval_s.json 42`
- Output: Timestamped JSON file with F1 scores
- Database: EvaluationRun and EvaluationResult tables track history
```

**Validation**: CLAUDE.md contains LongMemEval section

---

### T021 [P]: Create sample dataset for testing
**Description**: Create a small sample LongMemEval dataset for local testing
**File**: `data/longmemeval_sample.json`
**Content**: 5-10 hand-crafted questions covering different types:
- 2 single-session questions
- 2 multi-session questions
- 1 temporal-reasoning question

**Purpose**: Developers can test without downloading full dataset

**Format**: Follow LongMemEvalQuestion schema from contracts

**Validation**: Sample dataset loads successfully via DatasetLoader

---

### T022: Run full quickstart validation
**Description**: Execute complete quickstart.md workflow to validate feature
**Reference**: `specs/002-scope-integrate-longmemeval/quickstart.md`
**Steps**:
1. Download real longmemeval_s.json dataset
2. Run evaluation: `pnpm run eval:longmemeval data/longmemeval_s.json 42`
3. Verify all acceptance criteria pass:
   - AC1: All 500 questions loaded and processed
   - AC2: Multi-session questions score > 0.7 (30% threshold)
   - AC3: F1 scores are accurate (spot check samples)
   - AC4: Errors logged correctly
   - AC5: Reproducible results with same seed
4. Verify database records created
5. Verify output JSON format

**Success Criteria**: All acceptance tests pass

**Validation**: Manual execution of quickstart.md succeeds

---

## Dependencies

```
Setup (T001-T003)
  ↓
Tests Written (T004-T009) [ALL PARALLEL]
  ↓
Core Implementation:
  T010 [P] → (scoring)
  T011 [P] → (dataset loader)
  T012 → T013 → T014 → T015 (chat service → replayer → runner → CLI)
  ↓
Integration (T016-T017) [PARALLEL with core]
  ↓
Polish (T018-T022) [ALL PARALLEL]
```

**Critical Path**: T001 → T003 → T004-T009 → T012 → T013 → T014 → T015 → T022

**Parallelizable Groups**:
- Group A (Tests): T004, T005, T006, T007, T008, T009
- Group B (Core): T010, T011 (independent of each other)
- Group C (Integration): T016, T017 (can run with T014-T015)
- Group D (Polish): T018, T019, T020, T021

---

## Parallel Execution Examples

### Example 1: Run all contract tests in parallel
```bash
# After T003 is complete, launch all test tasks together:
pnpm test tests/contract/eval/dataset-loader.test.ts &
pnpm test tests/contract/eval/scoring.test.ts &
pnpm test tests/contract/eval/conversation-replayer.test.ts &
pnpm test tests/contract/eval/evaluation-runner.test.ts &
wait
# All should fail initially (no implementation yet)
```

### Example 2: Implement independent modules in parallel
```bash
# T010 and T011 can be implemented simultaneously (different files)
# Developer 1 works on T010 (lib/eval/scoring.ts)
# Developer 2 works on T011 (lib/eval/dataset-loader.ts)
# Both can run their tests independently
```

### Example 3: Final polish tasks in parallel
```bash
# After all core implementation is done:
# Run T018, T019, T020, T021 all at once (different files, no dependencies)
```

---

## Validation Checklist
*GATE: Checked before marking tasks as complete*

- [x] All contracts have corresponding tests (T004-T007)
- [x] All entities have model tasks (T003 for schema, T016 for queries)
- [x] All tests come before implementation (T004-T009 before T010-T015)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path (verified)
- [x] No task modifies same file as another [P] task (verified)

---

## Notes

- **TDD Enforcement**: Tests T004-T009 MUST fail before proceeding to T010-T015
- **Database Migration**: T003 must complete before any integration/E2E tests
- **Resilient Mode**: Evaluation continues on errors (per spec FR-020)
- **Direct Mastra Calls**: CLI calls Mastra agent directly (no HTTP, no server required)
- **No HTTP Dependencies**: Entire evaluation runs in Node.js with direct database access
- **Chat Creation**: Created directly via `saveChat()` Drizzle query (no endpoint needed)
- **Message Saving**: All messages saved directly via `saveMessages()` Drizzle query
- **Output Format**: Timestamped JSON files in format `longmemeval-results-YYYYMMDD-HHMMSS.json`
- **Performance**: F1 scoring target < 100ms per computation (T019)
- **Subset Testing**: CLI supports `--subset N` to run only first N questions for quick testing
- **No Seed Support**: Gemini 2.5 Flash/Pro models do not support deterministic seed (results may vary)
- **No Server Required**: CLI can run offline with just database access
- **No UI Changes**: Entire feature is CLI/backend only

**Architecture with Provider-Level Mocking**:
```
CLI Script (tsx)
    ↓
EvaluationRunner
    ↓
ConversationReplayer
    ↓
├─ MockedChatService (for haystack replay)
│     ↓
│  mockedMastra.agents.assistantAgent.generate() ← Mastra WITH mock LLM provider
│     ↓
│  MockLanguageModelV2 (returns dataset responses) → Memory still created ✓
│     ↓
│  Database (via Drizzle ORM)
│
└─ ProductionChatService (for eval questions)
      ↓
   mastra.agents.assistantAgent.generate() ← Mastra WITH real Gemini provider
      ↓
   Gemini 2.5 Flash/Pro (real LLM)
      ↓
   Database (via Drizzle ORM)
```

**Critical Architectural Principle**: Mock the LLM provider, NOT Mastra. Both services call Mastra's agent, ensuring memory creation works correctly during haystack replay.

**No HTTP layer involved** - All operations are direct function calls

---

## Task Summary

**Total Tasks**: 22 (reduced from 23 - removed seed support for Gemini models)
**Parallelizable Tasks**: 13 (marked with [P])
**Sequential Tasks**: 9 (dependency chains)

**Estimated Effort**:
- Setup: 3 tasks (~2 hours)
- Tests: 6 tasks (~6 hours)
- Core Implementation: 6 tasks (~12 hours)
- Integration: 2 tasks (~2 hours)
- Polish: 5 tasks (~4 hours)

**Total**: ~26 hours (can be reduced to ~17 hours with parallel execution)

---

**Status**: Ready for implementation. Begin with T001.
