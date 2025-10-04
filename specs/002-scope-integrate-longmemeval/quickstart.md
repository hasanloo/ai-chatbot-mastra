# Quickstart: LongMemEval Integration

**Feature**: LongMemEval Integration for Memory-Augmented Chatbot Testing
**Date**: 2025-10-02

## Overview

This quickstart guide walks through running a LongMemEval evaluation from start to finish, validating that the integration works correctly and produces expected results.

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Ensure all dependencies are installed
   pnpm install

   # Verify database connection
   pnpm db:studio  # Should open Drizzle Studio UI

   # Run database migrations (includes new EvaluationRun/EvaluationResult tables)
   pnpm db:migrate
   ```

2. **Dataset Setup**:
   ```bash
   # Create data directory
   mkdir -p data/

   # Download LongMemEval dataset (choose one variant)
   # Option A: Small dataset (~40 sessions, ~115k tokens)
   curl -L -o data/longmemeval_s.json.tar.gz \
     https://github.com/xiaowu0162/LongMemEval/releases/download/v1.0/longmemeval_s.json.tar.gz
   cd data && tar -xzvf longmemeval_s.json.tar.gz && cd ..

   # Option B: Medium dataset (~500 sessions)
   curl -L -o data/longmemeval_m.json.tar.gz \
     https://github.com/xiaowu0162/LongMemEval/releases/download/v1.0/longmemeval_m.json.tar.gz
   cd data && tar -xzvf longmemeval_m.json.tar.gz && cd ..

   # Verify dataset file exists
   ls -lh data/longmemeval_s.json
   ```

3. **Environment Variables**:
   ```bash
   # Add to .env.local if not already present

   # PostgreSQL connection (should already exist)
   POSTGRES_URL=postgres://user:password@localhost:5432/chatbot

   # Optional: LongMemEval configuration
   LONGMEMEVAL_SEED=42               # For deterministic generation (optional)
   LONGMEMEVAL_OUTPUT_DIR=./eval-results  # Output directory (optional)
   ```

## Step-by-Step Evaluation

### Step 1: Verify Installation

Run the evaluation script with the `--help` flag to verify it's accessible:

```bash
pnpm run eval:longmemeval --help
```

**Expected Output**:
```
LongMemEval Evaluation Runner

Usage:
  pnpm run eval:longmemeval [dataset_path] [seed] [output_dir]

Arguments:
  dataset_path   Path to LongMemEval JSON file (default: data/longmemeval_s.json)
  seed           Seed for deterministic generation (optional)
  output_dir     Output directory for results (default: current directory)

Examples:
  pnpm run eval:longmemeval
  pnpm run eval:longmemeval data/longmemeval_m.json
  pnpm run eval:longmemeval data/longmemeval_s.json 42 ./results
```

### Step 2: Run Evaluation (Small Dataset)

Run the evaluation on the small dataset for quick validation:

```bash
pnpm run eval:longmemeval data/longmemeval_s.json 42
```

**Expected Output** (abbreviated):
```
[LongMemEval] Starting evaluation...
[LongMemEval] Dataset: data/longmemeval_s.json
[LongMemEval] Seed: 42 (deterministic mode)
[LongMemEval] Output directory: .

[LongMemEval] Loading dataset...
[LongMemEval] Loaded 500 questions from dataset

[LongMemEval] Creating evaluation run in database...
[LongMemEval] Evaluation run ID: 550e8400-e29b-41d4-a716-446655440000

[LongMemEval] Starting evaluation of 500 questions...

[1/500] Question ID: sq_001
  Type: single-session-user
  Creating chat entity... Chat ID: 660e8400-e29b-41d4-a716-446655440001
  Replaying 1 session(s) with 8 turns...
  Asking evaluation question...
  Model answer: "John Smith"
  Gold answer: "John Smith"
  F1 Score: 1.0000
  ✓ Completed in 2.3s

[2/500] Question ID: ms_042
  Type: multi-session
  Creating chat entity... Chat ID: 770e8400-e29b-41d4-a716-446655440002
  Replaying 3 session(s) with 24 turns...
  Asking evaluation question...
  Model answer: "The meeting is scheduled for Tuesday at 2pm"
  Gold answer: "Tuesday at 2pm"
  F1 Score: 0.8571
  ✓ Completed in 5.1s

...

[500/500] Question ID: abs_120
  Type: abstention
  Creating chat entity... Chat ID: 880e8400-e29b-41d4-a716-446655440200
  Replaying 2 session(s) with 15 turns...
  Asking evaluation question...
  Model answer: "I don't have enough information to answer that"
  Gold answer: "I don't know"
  F1 Score: 0.2500
  ✓ Completed in 3.8s

[LongMemEval] Evaluation complete!
[LongMemEval] Total questions: 500
[LongMemEval] Completed: 497
[LongMemEval] Failed: 3
[LongMemEval] Average F1 Score: 0.7821

[LongMemEval] Generating output file...
[LongMemEval] Output written to: longmemeval-results-20251002-143022.json

[LongMemEval] Summary:
  - Dataset: longmemeval_s
  - Duration: 42m 18s
  - Average F1: 0.7821
  - Output: longmemeval-results-20251002-143022.json
```

**If Errors Occur**:
- Check database connection is active
- Verify dataset file path is correct
- Check Mastra agent configuration is valid
- Review error logs for specific failures

### Step 3: Verify Output File

Inspect the generated output JSON file:

```bash
cat longmemeval-results-20251002-143022.json | jq '.' | head -50
```

**Expected Structure**:
```json
{
  "metadata": {
    "dataset_name": "longmemeval_s",
    "dataset_path": "data/longmemeval_s.json",
    "total_questions": 500,
    "completed_questions": 497,
    "failed_questions": 3,
    "average_f1_score": 0.7821,
    "seed": 42,
    "started_at": "2025-10-02T14:30:22.123Z",
    "completed_at": "2025-10-02T15:12:40.456Z",
    "output_file": "longmemeval-results-20251002-143022.json"
  },
  "results": [
    {
      "question_id": "sq_001",
      "question_type": "single-session-user",
      "question": "What is the name mentioned in the previous conversation?",
      "answer": "John Smith",
      "model_answer": "John Smith",
      "score": 1.0
    },
    {
      "question_id": "ms_042",
      "question_type": "multi-session",
      "question": "When is the meeting scheduled?",
      "answer": "Tuesday at 2pm",
      "model_answer": "The meeting is scheduled for Tuesday at 2pm",
      "score": 0.8571
    }
    // ... 495 more results
  ],
  "errors": [
    {
      "question_id": "tr_089",
      "error_message": "Replay error for tr_089 at evaluation_question: Request timeout after 60000ms",
      "timestamp": "2025-10-02T14:45:12.789Z"
    }
    // ... 2 more errors
  ]
}
```

**Validation Checks**:
```bash
# Check total results count
cat longmemeval-results-*.json | jq '.metadata.total_questions'
# Should output: 500

# Check average F1 score is reasonable (0.5 - 0.9 expected range)
cat longmemeval-results-*.json | jq '.metadata.average_f1_score'
# Should output: a number between 0 and 1

# Check for errors
cat longmemeval-results-*.json | jq '.errors | length'
# Should output: 3 (or small number)
```

### Step 4: Verify Database Records

Check that evaluation data was persisted correctly:

```bash
# Open Drizzle Studio
pnpm db:studio

# Navigate to:
# 1. EvaluationRun table - should see 1 new row
# 2. EvaluationResult table - should see 497 rows (one per completed question)
# 3. Chat table - should see 500 new chats (one per question, including failed ones)
# 4. Message_v2 table - should see thousands of new messages (replayed turns + eval Q&A)
```

**Expected EvaluationRun row**:
```
id: 550e8400-e29b-41d4-a716-446655440000
datasetName: longmemeval_s
totalQuestions: 500
completedQuestions: 497
failedQuestions: 3
averageF1Score: 0.7821
seed: 42
startedAt: 2025-10-02T14:30:22.123Z
completedAt: 2025-10-02T15:12:40.456Z
outputFilePath: longmemeval-results-20251002-143022.json
```

### Step 5: Analyze Results

Run basic analysis on the output:

```bash
# Find best performing question types
cat longmemeval-results-*.json | jq '
  .results
  | group_by(.question_type)
  | map({type: .[0].question_type, avg_score: (map(.score) | add / length), count: length})
  | sort_by(.avg_score)
  | reverse
'
```

**Expected Output**:
```json
[
  {
    "type": "single-session-user",
    "avg_score": 0.8923,
    "count": 150
  },
  {
    "type": "multi-session",
    "avg_score": 0.7645,
    "count": 120
  },
  {
    "type": "temporal-reasoning",
    "avg_score": 0.7102,
    "count": 100
  },
  {
    "type": "knowledge-update",
    "avg_score": 0.6834,
    "count": 80
  },
  {
    "type": "abstention",
    "avg_score": 0.3521,
    "count": 50
  }
]
```

## Acceptance Criteria Validation

### AC1: Load dataset and replay conversations

**Test**:
```bash
pnpm run eval:longmemeval data/longmemeval_s.json
```

**Expected**: All 500 questions loaded, conversations replayed without crashes

**Validation**: ✓ Pass if output shows "Loaded 500 questions" and completes without fatal errors

### AC2: Multi-session conversations maintain context

**Test**: Check a multi-session question result:
```bash
cat longmemeval-results-*.json | jq '.results[] | select(.question_type == "multi-session") | select(.score > 0.8) | .question_id' | head -5
```

**Expected**: At least some multi-session questions score > 0.8 (indicating memory retention)

**Validation**: ✓ Pass if at least 30% of multi-session questions have F1 > 0.7

### AC3: F1 scoring produces accurate scores

**Test**: Manually verify a few scores:
```bash
# Get a sample result
cat longmemeval-results-*.json | jq '.results[0]'

# Expected output shows:
# "answer": "John Smith"
# "model_answer": "John Smith"
# "score": 1.0  <-- Perfect match

# Get another example with partial match
cat longmemeval-results-*.json | jq '.results[] | select(.score > 0.5 and .score < 0.9) | {answer, model_answer, score}' | head -20
```

**Validation**: ✓ Pass if:
- Identical answers have score = 1.0
- Completely different answers have score ≈ 0.0
- Partial overlap shows intermediate scores (0.3 - 0.9)

### AC4: Error handling is resilient

**Test**: Check the errors array:
```bash
cat longmemeval-results-*.json | jq '.errors'
```

**Expected**: Errors logged with question_id, error_message, timestamp

**Validation**: ✓ Pass if:
- Errors array exists (even if empty)
- Failed questions are logged in errors array
- Evaluation completed despite errors (didn't crash)

### AC5: Reproducible results with seed

**Test**: Run evaluation twice with same seed:
```bash
pnpm run eval:longmemeval data/longmemeval_s.json 42 ./run1
pnpm run eval:longmemeval data/longmemeval_s.json 42 ./run2

# Compare results (ignoring timestamps)
diff <(jq '.results | sort_by(.question_id)' ./run1/longmemeval-results-*.json) \
     <(jq '.results | sort_by(.question_id)' ./run2/longmemeval-results-*.json)
```

**Expected**: No differences in results (if model supports seed)

**Validation**: ✓ Pass if diffs are empty OR seed is documented as unsupported

## Success Criteria

- [ ] Evaluation completes without crashing
- [ ] All 500 questions are processed (completed or failed)
- [ ] Average F1 score is between 0.5 and 0.9 (reasonable range)
- [ ] Output JSON file is valid and contains all required fields
- [ ] Database records are created correctly
- [ ] Failed questions are logged in errors array
- [ ] Reproducibility: Same seed produces same results (if model supports)

## Troubleshooting

### "Database connection failed"
```bash
# Check POSTGRES_URL is correct
echo $POSTGRES_URL

# Verify database is running
psql $POSTGRES_URL -c "SELECT 1;"

# Run migrations
pnpm db:migrate
```

### "Dataset file not found"
```bash
# Verify file exists and path is correct
ls -lh data/longmemeval_s.json

# Check file permissions
chmod 644 data/longmemeval_s.json
```

### "Mastra agent errors"
```bash
# Verify Mastra configuration
cat mastra/index.ts

# Check agent is registered
grep -r "assistantAgent" mastra/

# Verify API keys are set (if using external LLM)
echo $OPENAI_API_KEY  # or other provider key
```

### "Low F1 scores (< 0.3)"
- Check that Mastra memory is properly configured
- Verify conversation history is being stored in database
- Review a few example results to see if answers are completely unrelated
- May indicate memory is not retaining context properly

## Next Steps

After successful quickstart validation:

1. **Run full medium dataset**:
   ```bash
   pnpm run eval:longmemeval data/longmemeval_m.json 42
   ```

2. **Analyze results in detail**:
   - Generate charts/graphs of F1 scores by question type
   - Identify weakest question types for targeted improvement
   - Compare against LongMemEval paper baseline scores

3. **Integrate into CI/CD**:
   - Add evaluation as a periodic benchmark test
   - Track F1 score trends over time
   - Alert if scores drop below threshold

4. **Experiment with improvements**:
   - Tune Mastra memory configuration
   - Adjust agent prompts
   - Compare different LLM models
