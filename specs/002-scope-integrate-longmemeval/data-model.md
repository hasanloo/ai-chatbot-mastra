# Data Model: LongMemEval Integration

**Date**: 2025-10-02
**Feature**: LongMemEval Integration for Memory-Augmented Chatbot Testing

## Overview

This document defines the data entities for the LongMemEval integration. The feature will leverage the existing production database (PostgreSQL with Drizzle ORM) and existing entities (User, Chat, Message_v2) while adding new evaluation-specific entities to track evaluation runs and results.

## Existing Entities (No Changes)

### User
**Source**: `lib/db/schema.ts`
**Purpose**: Represents users in the system
**Fields**:
- `id` (uuid, primary key): Unique user identifier
- `email` (varchar 64): User email
- `password` (varchar 64, optional): Hashed password

**Usage in Evaluation**: A dedicated evaluation user will be created for running LongMemEval tests to isolate evaluation data from production users.

### Chat
**Source**: `lib/db/schema.ts`
**Purpose**: Represents a conversation thread
**Fields**:
- `id` (uuid, primary key): Unique chat identifier
- `createdAt` (timestamp): Chat creation time
- `title` (text): Chat title/description
- `userId` (uuid, foreign key → User): Owner of the chat
- `visibility` (enum: 'public' | 'private'): Chat visibility setting

**Usage in Evaluation**: Each LongMemEval question will create a unique Chat entity to replay the conversation history and test the evaluation question.

### Message_v2
**Source**: `lib/db/schema.ts`
**Purpose**: Represents individual messages in a chat
**Fields**:
- `id` (uuid, primary key): Unique message identifier
- `chatId` (uuid, foreign key → Chat): Parent chat
- `role` (varchar): Message role ('user' or 'assistant')
- `parts` (json): Message content parts
- `attachments` (json): Message attachments
- `createdAt` (timestamp): Message creation time

**Usage in Evaluation**: All replayed conversation turns (from haystack_sessions) and evaluation question/answer pairs will be stored as Message_v2 records.

## New Entities (To Be Added)

### EvaluationRun
**Purpose**: Tracks a complete execution of the LongMemEval evaluation process
**Storage**: Database table via Drizzle ORM schema extension
**Schema**:
```typescript
export const evaluationRun = pgTable('EvaluationRun', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  datasetName: varchar('datasetName', { length: 100 }).notNull(),      // e.g., 'longmemeval_s', 'longmemeval_m'
  datasetPath: text('datasetPath').notNull(),                          // File path to dataset JSON
  totalQuestions: integer('totalQuestions').notNull(),                 // Total eval questions in dataset
  completedQuestions: integer('completedQuestions').notNull().default(0), // Successfully evaluated
  failedQuestions: integer('failedQuestions').notNull().default(0),    // Failed evaluations
  averageF1Score: real('averageF1Score'),                              // Mean F1 across all questions
  seed: integer('seed'),                                               // Optional: seed for deterministic generation
  startedAt: timestamp('startedAt').notNull(),                         // Run start timestamp
  completedAt: timestamp('completedAt'),                               // Run completion timestamp (null if in progress)
  outputFilePath: text('outputFilePath'),                              // Path to generated JSON results file
  userId: uuid('userId')                                               // Evaluation user ID
    .notNull()
    .references(() => user.id),
});

export type EvaluationRun = InferSelectModel<typeof evaluationRun>;
```

**Relationships**:
- `userId` → `User.id`: The dedicated evaluation user
- One-to-many with `EvaluationResult`

**Lifecycle**:
1. Created at evaluation start with `startedAt`, `datasetPath`, `totalQuestions`
2. Updated incrementally as questions are evaluated (`completedQuestions`, `failedQuestions`)
3. Finalized with `completedAt`, `averageF1Score`, `outputFilePath` when run completes

**Validation Rules**:
- `datasetName` must be non-empty
- `totalQuestions` must be > 0
- `completedQuestions + failedQuestions ≤ totalQuestions`
- `averageF1Score` must be between 0 and 1 (if not null)
- `completedAt` must be ≥ `startedAt` (if not null)

### EvaluationResult
**Purpose**: Stores the result of evaluating a single question from the LongMemEval dataset
**Storage**: Database table via Drizzle ORM schema extension
**Schema**:
```typescript
export const evaluationResult = pgTable('EvaluationResult', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  evaluationRunId: uuid('evaluationRunId')
    .notNull()
    .references(() => evaluationRun.id, { onDelete: 'cascade' }),
  questionId: varchar('questionId', { length: 100 }).notNull(),        // From dataset: question_id
  questionType: varchar('questionType', { length: 100 }).notNull(),    // From dataset: question_type
  question: text('question').notNull(),                                // The evaluation question text
  goldAnswer: text('goldAnswer').notNull(),                            // Expected answer from dataset
  modelAnswer: text('modelAnswer').notNull(),                          // Generated answer from assistant
  f1Score: real('f1Score').notNull(),                                  // F1 token overlap score (0-1)
  chatId: uuid('chatId')                                               // Chat entity created for this eval
    .notNull()
    .references(() => chat.id),
  errorMessage: text('errorMessage'),                                  // Error details if evaluation failed
  evaluatedAt: timestamp('evaluatedAt').notNull(),                     // Timestamp of evaluation
});

export type EvaluationResult = InferSelectModel<typeof evaluationResult>;
```

**Relationships**:
- `evaluationRunId` → `EvaluationRun.id`: Parent evaluation run (cascade delete)
- `chatId` → `Chat.id`: The Chat entity created for replaying this question's conversation

**Lifecycle**:
1. Created after a question is evaluated (successfully or with error)
2. Immutable after creation (no updates)

**Validation Rules**:
- `questionId` must be unique within an `evaluationRunId`
- `f1Score` must be between 0 and 1
- If `errorMessage` is not null, `f1Score` should be 0 (failed evaluation)
- `goldAnswer` and `modelAnswer` must be non-empty
- `evaluatedAt` must be within the time range of parent `EvaluationRun` (startedAt ≤ evaluatedAt ≤ completedAt)

## In-Memory/Transient Entities (Not Persisted)

### LongMemEvalQuestion
**Purpose**: Represents a single evaluation question entry from the LongMemEval dataset JSON
**Storage**: In-memory only (loaded from JSON, not persisted to database)
**TypeScript Interface**:
```typescript
interface LongMemEvalQuestion {
  question_id: string;                    // Unique question identifier from dataset
  question_type: string;                  // Question category (e.g., 'single-session-user', 'temporal-reasoning')
  question: string;                       // The evaluation question text
  answer: string;                         // Gold standard answer
  question_date: string;                  // ISO timestamp of question
  haystack_session_ids: string[];         // List of session identifiers
  haystack_dates: string[];               // Timestamps for each session
  haystack_sessions: ConversationTurn[][]; // Multi-session conversation history
}
```

**Validation Rules** (from research):
- `question_id` must be non-empty and unique within dataset
- `question_type` must be one of the known types (single-session-user, multi-session, temporal-reasoning, knowledge-update, abstention)
- `question` and `answer` must be non-empty strings
- `haystack_sessions` must be a 2D array (sessions containing turns)
- Each session must contain at least one turn

### ConversationTurn
**Purpose**: Represents a single user or assistant turn in a conversation history
**Storage**: In-memory only (loaded from dataset JSON)
**TypeScript Interface**:
```typescript
interface ConversationTurn {
  role: 'user' | 'assistant';             // Speaker role
  content: string;                        // Message content
  has_answer?: boolean;                   // Optional: marks turns with key evidence
}
```

**Validation Rules**:
- `role` must be exactly 'user' or 'assistant'
- `content` must be non-empty string
- `has_answer` is optional metadata (informational only, not used in replay logic)

### EvaluationOutput
**Purpose**: Represents the final JSON output file structure for evaluation results
**Storage**: File system (JSON file with auto-generated timestamped filename)
**TypeScript Interface**:
```typescript
interface EvaluationOutput {
  metadata: {
    dataset_name: string;                 // e.g., 'longmemeval_s'
    dataset_path: string;                 // Path to source dataset
    total_questions: number;              // Total questions in dataset
    completed_questions: number;          // Successfully evaluated
    failed_questions: number;             // Failed evaluations
    average_f1_score: number;             // Mean F1 across completed questions
    seed?: number;                        // Optional: seed used for determinism
    started_at: string;                   // ISO timestamp
    completed_at: string;                 // ISO timestamp
    output_file: string;                  // Filename of this output
  };
  results: EvaluationResultOutput[];      // Per-question results
  errors?: EvaluationError[];             // Optional: detailed error log
}

interface EvaluationResultOutput {
  question_id: string;
  question_type: string;
  question: string;
  answer: string;                         // Gold answer
  model_answer: string;                   // Generated answer
  score: number;                          // F1 score (0-1)
}

interface EvaluationError {
  question_id: string;
  error_message: string;
  timestamp: string;
}
```

**File Naming Convention**:
```
longmemeval-results-YYYYMMDD-HHMMSS.json
```
Example: `longmemeval-results-20251002-143022.json`

**Validation Rules**:
- `metadata.total_questions` must equal `metadata.completed_questions + metadata.failed_questions`
- `results.length` must equal `metadata.completed_questions`
- `errors.length` must equal `metadata.failed_questions` (if errors array exists)
- All `score` values must be between 0 and 1

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ 1
       │
       │ *
┌──────▼───────────┐
│ EvaluationRun    │
│ ─────────────── │
│ id (PK)          │
│ datasetName      │
│ totalQuestions   │
│ averageF1Score   │
│ userId (FK)      │
└──────┬───────────┘
       │ 1
       │
       │ *
┌──────▼───────────────┐         ┌──────────────┐
│ EvaluationResult     │ *    1  │     Chat     │
│ ──────────────────   │─────────│ ─────────────│
│ id (PK)              │         │ id (PK)      │
│ evaluationRunId (FK) │         │ userId (FK)  │
│ questionId           │         └──────┬───────┘
│ f1Score              │                │ 1
│ chatId (FK)          │                │
└──────────────────────┘                │ *
                                 ┌──────▼───────┐
                                 │  Message_v2  │
                                 │ ──────────── │
                                 │ id (PK)      │
                                 │ chatId (FK)  │
                                 │ role         │
                                 │ parts        │
                                 └──────────────┘

┌─────────────────────────┐
│ LongMemEvalQuestion     │ (In-memory, from JSON)
│ ───────────────────────│
│ question_id             │
│ question_type           │
│ question                │
│ answer                  │
│ haystack_sessions       │ (ConversationTurn[][])
└─────────────────────────┘
```

## Data Flow

1. **Dataset Loading**:
   - Read `longmemeval_s.json` → array of `LongMemEvalQuestion` objects
   - Validate schema for each question
   - Store in memory for processing

2. **Evaluation Run Initialization**:
   - Create `EvaluationRun` record with metadata
   - Create or retrieve dedicated evaluation `User`

3. **Per-Question Evaluation**:
   - Create new `Chat` entity for the question
   - Replay `haystack_sessions` turns → create `Message_v2` records (mocked responses)
   - Send evaluation `question` as new user message
   - Capture real assistant response → create `Message_v2` record
   - Compute F1 score
   - Create `EvaluationResult` record
   - Update `EvaluationRun` counters

4. **Evaluation Completion**:
   - Finalize `EvaluationRun` with `completedAt`, `averageF1Score`
   - Generate `EvaluationOutput` JSON file
   - Write to file system with timestamped filename

## Database Migration Requirements

**New Tables**:
1. `EvaluationRun` table with schema defined above
2. `EvaluationResult` table with schema defined above

**Indexes**:
- `EvaluationRun.userId` (foreign key index)
- `EvaluationResult.evaluationRunId` (foreign key index)
- `EvaluationResult.chatId` (foreign key index)
- `EvaluationResult.questionId, evaluationRunId` (composite unique index)

**Migration Script**:
Will be generated via Drizzle Kit:
```bash
pnpm db:generate  # Generate migration SQL
pnpm db:migrate   # Apply migration to database
```

## Data Retention

- **EvaluationRun and EvaluationResult**: Retained indefinitely for historical tracking and comparison across runs
- **Chat and Message_v2** created during evaluation: Retained to allow post-evaluation analysis of conversation history
- **Output JSON files**: Retained on file system; users may manually delete old files

**Future Consideration**: Add a cleanup script to delete old evaluation data (e.g., runs older than 90 days) if storage becomes a concern.

## Summary

**Entities Added**:
1. `EvaluationRun` (database table)
2. `EvaluationResult` (database table)
3. `LongMemEvalQuestion` (in-memory)
4. `ConversationTurn` (in-memory)
5. `EvaluationOutput` (file system JSON)

**Entities Reused**:
1. `User` (dedicated evaluation user)
2. `Chat` (one per evaluation question)
3. `Message_v2` (replayed turns + eval Q&A)

**Total Database Impact**:
- 2 new tables
- 4 new indexes
- Estimated storage: ~1-2 MB per evaluation run (500 questions with ~40 sessions each)
