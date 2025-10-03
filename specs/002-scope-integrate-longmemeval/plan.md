# Implementation Plan: LongMemEval Integration for Memory-Augmented Chatbot Testing

**Branch**: `002-scope-integrate-longmemeval` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/hasan/Development/ai-chatbot-mastra/specs/002-scope-integrate-longmemeval/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Integration of the LongMemEval benchmark dataset into the AI chatbot system to evaluate memory retention and recall capabilities across multi-turn conversations. The system will replay conversations from the dataset through the existing POST /api/chat endpoint, mock assistant responses from the dataset except at evaluation points, and score the real assistant outputs using F1 token overlap. This leverages the existing production database and Mastra memory infrastructure without modifying core memory logic.

## Technical Context
**Language/Version**: TypeScript 5.6.3 with Next.js 15.3.0
**Primary Dependencies**: Mastra (@mastra/core 0.15.3, @mastra/memory 0.14.3, @mastra/pg 0.15.0), Drizzle ORM 0.34.0, AI SDK 5.0.26, Next.js 15, NextAuth.js 5
**Storage**: PostgreSQL via @vercel/postgres with Drizzle ORM (leveraging existing production database)
**Testing**: Playwright for E2E tests, contract tests for API endpoints
**Target Platform**: Node.js server (Next.js App Router)
**Project Type**: Web (Next.js full-stack application)
**Performance Goals**: Accuracy over speed (no strict runtime limit), F1 scoring computation < 100ms per evaluation
**Constraints**: Must not modify Mastra core memory, must use existing database, must support deterministic replay with seeding
**Scale/Scope**: LongMemEval dataset processing (size TBD during research), CLI script execution, timestamped JSON output files

**User-Provided Implementation Details**: We are going to build this integration leveraging the same production database (PostgreSQL with existing User, Chat, Message_v2 tables via Drizzle ORM).

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality Standards (Principle I)
- [x] ESLint/Biome configuration present (verified in package.json)
- [x] TypeScript strict mode enabled (verified in project)
- [x] Path aliases configured for imports (`@/*` aliases in use)
- [x] Drizzle ORM used for all database access (existing pattern maintained)

### Testing Standards (Principle II - NON-NEGOTIABLE)
- [x] TDD workflow planned: Tests written before implementation
- [x] Contract tests identified for all API endpoints (evaluation runner API if created)
- [x] Integration tests identified for user-facing features (conversation replay, scoring)
- [x] Playwright E2E tests planned for critical journeys (full evaluation run)
- [x] Test coverage target ≥80% for critical paths (replay logic, F1 scoring)

### UX Consistency (Principle III)
- [x] No UI changes required - CLI-only feature
- [x] Error messages are user-friendly (CLI output, JSON logs)
- [x] Loading states designed for async operations (progress indicators for CLI)

### Performance Requirements (Principle IV)
- [x] TTFB target <200ms for API routes (existing /api/chat endpoint)
- [x] AI streaming first token <1s (existing requirement maintained)
- [x] Database queries <100ms p95 (replay queries will be optimized)
- [x] Server Components used by default (CLI uses server-side code)
- [x] Mastra agent singleton pattern enforced (existing pattern maintained)
- [x] Performance goal: F1 computation <100ms, no strict runtime limit for full dataset

### Security & Data Integrity (Principle V)
- [x] NextAuth.js v5 for authentication (not applicable - CLI script)
- [x] Zod schema validation for API routes (dataset validation schemas)
- [x] Environment variables not exposed to client (CLI-only)
- [x] Chat visibility settings respected (evaluation uses isolated test data)
- [x] Database migrations are reversible (if schema changes needed)

### Maintainability & Documentation (Principle VI)
- [x] Complex logic documented with rationale (F1 scoring, replay mocking)
- [x] Public APIs have JSDoc comments (evaluation runner functions)
- [x] Database schema changes versioned (via Drizzle if needed)
- [x] Environment variables documented in .env.example (dataset paths, config)
- [x] CLAUDE.md updated if architecture changes (will be updated in Phase 1)
- [x] New dependencies justified (may need F1 scoring library during research)

**Initial Gate Status**: ✅ PASS - All applicable constitutional requirements met

## Project Structure

### Documentation (this feature)
```
specs/002-scope-integrate-longmemeval/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── (chat)/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Existing endpoint (will be reused)
│   ├── page.tsx
│   └── chat/[id]/page.tsx

lib/
├── db/
│   ├── schema.ts                  # Existing schema (User, Chat, Message_v2)
│   ├── queries.ts                 # Existing queries
│   └── migrations/                # Drizzle migrations (if schema changes)
├── ai/
│   ├── models.ts                  # Existing AI models
│   └── providers.ts               # Existing providers
└── eval/                          # NEW: LongMemEval integration
    ├── dataset-loader.ts          # Load and parse LongMemEval JSON
    ├── conversation-replayer.ts   # Replay conversations via /api/chat
    ├── scoring.ts                 # F1 token overlap computation
    ├── mock-interceptor.ts        # Mock layer for dataset responses
    └── cli-runner.ts              # CLI entry point

mastra/
├── index.ts                       # Existing Mastra setup (PostgresStore)
└── agents/
    └── assistant-agent.ts         # Existing agent with memory

scripts/
└── eval-longmemeval.ts            # NEW: CLI script entry point

tests/
├── contract/
│   └── eval/
│       └── dataset-loader.test.ts # Contract tests for evaluation APIs
├── integration/
│   └── eval/
│       ├── conversation-replay.test.ts  # Replay integration tests
│       └── scoring.test.ts              # F1 scoring tests
└── e2e/
    └── eval/
        └── full-evaluation.spec.ts      # E2E Playwright test
```

**Structure Decision**: Web application structure with Next.js App Router. New evaluation logic will be added in `lib/eval/` for core functionality and `scripts/` for CLI entry point. Existing database schema (User, Chat, Message_v2) will be reused. No UI components needed - this is a server-side/CLI feature.

## Phase 0: Outline & Research
*Status: ✅ Completed*

1. **Extract unknowns from Technical Context**:
   - LongMemEval dataset format and structure (JSON schema, fields, conversation format)
   - LongMemEval dataset source and download method (GitHub, paper supplementary materials)
   - F1 token overlap computation method (algorithm, existing libraries)
   - Response mocking strategy for Next.js route handlers (middleware, HOC, dependency injection)
   - Deterministic seeding approach for Mastra agents (if randomization exists)
   - CLI framework for TypeScript/Node.js (minimist, commander, yargs, or native)

2. **Generate and dispatch research tasks**:
   - Task 1: Research LongMemEval dataset format (explore paper, GitHub repo, sample conversations)
   - Task 2: Research F1 token overlap scoring algorithms (NLP best practices, existing npm packages)
   - Task 3: Research response mocking patterns in Next.js route handlers (DI, middleware, test doubles)
   - Task 4: Research Mastra agent deterministic behavior (seed configuration, randomization control)
   - Task 5: Research TypeScript CLI frameworks (compare options, select lightweight solution)
   - Task 6: Research conversation replay patterns (preserving state, session management)

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all unknowns resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*
*Status: ✅ Completed*

1. **Extract entities from feature spec** → `data-model.md`:
   - EvaluationRun (tracks full dataset evaluation execution)
   - EvaluationResult (per-question result with scores)
   - ConversationTurn (dataset representation)
   - Will document relationship to existing Chat/Message_v2 entities

2. **Generate API contracts** from functional requirements:
   - No new HTTP endpoints (reusing POST /api/chat)
   - Internal function contracts for:
     - Dataset loader (load, parse, validate)
     - Conversation replayer (replay turn, handle mocking)
     - F1 scorer (compute score from two strings)
   - Output TypeScript interfaces to `/contracts/`

3. **Generate contract tests** from contracts:
   - Dataset loader tests (valid/invalid JSON, schema validation)
   - F1 scoring tests (edge cases: empty strings, identical strings, partial overlap)
   - Replay tests (message sequence, mock interception)
   - Tests must fail initially (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Scenario 1: Load dataset → replay conversation → evaluate → generate JSON log
   - Scenario 2: Multi-session conversation maintains context across sessions
   - Scenario 3: Error in one conversation skips and continues with next
   - Scenario 4: Reproducible results with same seed

5. **Update agent file incrementally**:
   - Execute: `.specify/scripts/bash/update-agent-context.sh claude`
   - Add LongMemEval integration context
   - Document new lib/eval/ structure
   - Keep under 150 lines

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P] (dataset-loader, scoring, replayer)
- Each entity → schema/model task [P] (EvaluationRun, EvaluationResult)
- Each integration scenario → integration test task
- Implementation tasks ordered by dependency: dataset → scoring → mocking → replay → CLI

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order:
  1. Dataset schema & loader tests → loader implementation
  2. F1 scoring tests → scoring implementation
  3. Mock interceptor tests → mock implementation
  4. Replay tests → replay implementation
  5. CLI integration tests → CLI implementation
  6. E2E full evaluation test → final validation
- Mark [P] for parallel execution (dataset loader, scoring can be developed in parallel)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. All constitutional requirements are satisfied:
- Existing linting/formatting/TypeScript config maintained
- TDD workflow enforced
- No UI changes (CLI-only feature)
- Performance goals defined (accuracy over speed)
- Security not applicable (CLI script, isolated test data)
- Documentation will be maintained (CLAUDE.md update planned)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none detected)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
