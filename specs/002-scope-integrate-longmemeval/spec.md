# Feature Specification: LongMemEval Integration for Memory-Augmented Chatbot Testing

**Feature Branch**: `002-scope-integrate-longmemeval`
**Created**: 2025-10-02
**Status**: Draft
**Input**: User description: "Scope
Integrate LongMemEval(https://openreview.net/pdf?id=pZiyCaVuti) test dataset into this chatbot system (ai-chatbot-mastra). The evaluation will simulate real-world usage by driving conversations through the POST /api/chat endpoint, with mocked assistant responses (from dataset) except at designated eval questions, where the system under test generates the real response.

Functional Requirements
1. Dataset Handling
    * The system SHALL support loading LongMemEval conversations .
2. Conversation Replay
    * The system SHALL replay all conversation turns via POST /api/chat.
    * When role = user, the utterance SHALL be passed as {"message": ...} payload and the next object with the role as assistant being mocked as the response from LLM for that message in the system
    * When the turn corresponds to an eval question, the system SHALL allow the real assistant pipeline (LLM + memory) to generate the output.
3. Multi-Session Support
    * The system SHALL ensure each conversation maps to a Mastra Chat Entity.
    * The replay SHALL continue across multiple sessions if the dataset includes breaks.
4. Evaluation
    * After replay reaches an eval question:
        * Capture the assistant's real generated answer.
        * Compare with the dataset gold_answer.
        * Compute score (e.g., exact match, F1, or LLM-graded similarity).
    * The system SHALL record results in a structured JSON log: {
    *   \"question_id\": \"...\",
    *   \"question_type\": \"single-session-user\",
    *   \"question\": \"What is X?\",
    *   \"answer\": \"Y\",
    *   \"model_answer\": \"Z\",
    *   \"score\": 0.85
    * }


Non-Functional Requirements
* Tests SHALL be reproducible (seeded replay, deterministic mocking).
* Evaluation script SHALL run as a script in CLI.
* Mocking SHALL not require changes to Mastra's core memory, only the chat service response layer."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## Clarifications

### Session 2025-10-02
- Q: Which scoring method(s) should be used to evaluate assistant answers against gold answers? → A: LLM-as-judge using gpt-4o-mini (following official LongMemEval methodology with >97% human agreement)
- Q: When an error occurs during dataset loading, conversation replay, or evaluation, should the system continue processing remaining conversations/questions or stop entirely? → A: Continue processing, skip failed item, log error (resilient)
- Q: What is the acceptable maximum runtime for processing the entire LongMemEval dataset? → A: No strict limit (optimize for accuracy over speed)
- Q: How are evaluation questions distinguished from regular conversation turns in the LongMemEval dataset? → A: Special field/flag in turn object (e.g., `"is_eval": true`)
- Q: Where should the evaluation results JSON log be written? → A: Auto-generated filename in current directory

---

## User Scenarios & Testing

### Primary User Story
As a chatbot system developer or researcher, I need to evaluate how well the memory-augmented chatbot retains and recalls information across multi-turn conversations by replaying standardized test conversations from the LongMemEval dataset and measuring the system's ability to answer evaluation questions correctly based on previously shared context.

### Acceptance Scenarios

1. **Given** a LongMemEval dataset conversation with multiple turns and evaluation questions, **When** the system replays the conversation through the chat endpoint, **Then** all user utterances are sent as messages, assistant responses from the dataset are mocked, and the system generates real responses only at designated evaluation questions.

2. **Given** a multi-session conversation in the dataset with session breaks, **When** the replay script processes the conversation, **Then** each session is properly tracked under the same chat entity, and the memory system maintains context across session boundaries.

3. **Given** an evaluation question has been answered by the real assistant pipeline, **When** the scoring mechanism compares the generated answer with the gold answer from the dataset, **Then** a similarity score is computed and recorded in a structured JSON log with all required fields (question_id, question_type, question, answer, model_answer, score).

4. **Given** the evaluation script is run multiple times with the same dataset and configuration, **When** deterministic mocking and seeded replay are enabled, **Then** the results are reproducible across runs.

5. **Given** a developer wants to run memory evaluation tests, **When** they invoke the evaluation script from the command line with the dataset path, **Then** the script processes all conversations, generates evaluation results, and outputs a comprehensive JSON log without requiring manual intervention.

### Edge Cases

- What happens when the dataset contains malformed conversation turns or missing required fields?
- How does the system handle evaluation questions that appear at the very beginning or end of a conversation?
- What should occur if the chat endpoint returns an error during replay?
- How are ties or ambiguous answers handled during scoring?
- What happens when gold answers contain multiple acceptable variations?
- How does the system behave if a session break occurs immediately before or after an evaluation question?

## Requirements

### Functional Requirements

**Dataset Handling**
- **FR-001**: System MUST be able to load and parse LongMemEval dataset conversations in their native format
- **FR-002**: System MUST validate that loaded conversations contain all required fields before starting replay
- **FR-003**: System MUST identify evaluation questions by checking for a special field/flag (e.g., `is_eval: true`) in each conversation turn object

**Conversation Replay**
- **FR-004**: System MUST send each user utterance from the dataset to the POST /api/chat endpoint with the message payload
- **FR-005**: System MUST mock assistant responses from the dataset for all non-evaluation turns without invoking the real LLM
- **FR-006**: System MUST allow the real assistant pipeline (LLM + memory) to generate responses only at designated evaluation question turns
- **FR-007**: System MUST preserve conversation context and message ordering during replay

**Multi-Session Support**
- **FR-008**: System MUST map each conversation from the dataset to a unique Mastra Chat Entity
- **FR-009**: System MUST maintain conversation continuity across multiple sessions when dataset includes session breaks
- **FR-010**: System MUST track session boundaries while ensuring the memory system retains context across sessions

**Evaluation & Scoring**
- **FR-011**: System MUST capture the assistant's generated answer when an evaluation question is processed
- **FR-012**: System MUST compare the generated answer with the gold answer from the dataset
- **FR-013**: System MUST evaluate answer correctness using an LLM-as-judge (gpt-4o-mini) following the official LongMemEval evaluation prompt: "I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes."
- **FR-014**: System MUST record evaluation results in structured JSON format containing: question_id, question_type, question, answer (gold), model_answer, score (0 or 1), and reasoning from the judge
- **FR-015**: System MUST aggregate results across all evaluation questions in a conversation

**Reproducibility & Execution**
- **FR-016**: System MUST support deterministic replay with seeded randomization to ensure reproducible results
- **FR-017**: System MUST provide a CLI script that can be invoked to run the evaluation on a specified dataset
- **FR-018**: System MUST complete evaluation without requiring changes to Mastra's core memory implementation
- **FR-019**: System MUST output evaluation results to an auto-generated filename in the current directory with a timestamp-based naming pattern (e.g., `longmemeval-results-YYYYMMDD-HHMMSS.json`)

**Error Handling**
- **FR-020**: System MUST continue processing remaining conversations/questions when errors occur, skip the failed item, and log the error with full context
- **FR-021**: System MUST report which conversations or questions failed evaluation and the reason for failure in the final evaluation log

### Non-Functional Requirements

**Reproducibility**
- **NFR-001**: Evaluation runs with identical dataset and configuration MUST produce identical results
- **NFR-002**: All randomization used during evaluation MUST be seedable

**Performance**
- **NFR-003**: System prioritizes evaluation accuracy over speed; no strict runtime limit is imposed for processing the dataset

**Maintainability**
- **NFR-004**: Mocking layer MUST be implemented without modifying Mastra's core memory or chat entity logic
- **NFR-005**: Evaluation script MUST be easily configurable for different datasets and evaluation parameters

### Key Entities

- **LongMemEval Conversation**: Represents a complete multi-turn conversation from the dataset, containing user and assistant turns, session breaks, and evaluation questions with gold answers
- **Evaluation Question**: A conversation turn marked with a special field/flag that indicates the real assistant pipeline should generate a response to be evaluated against a gold answer
- **Chat Entity**: The Mastra system's representation of a conversation, which stores message history and supports memory operations
- **Session**: A contiguous sequence of conversation turns; conversations may span multiple sessions with breaks in between
- **Evaluation Result**: A record containing the question, gold answer, model-generated answer, computed score, and metadata for a single evaluation question
- **Evaluation Log**: An aggregated collection of evaluation results across all questions in the dataset, output in structured JSON format

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (5 clarifications applied)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

**Status**: SUCCESS "Spec ready for planning phase"

---
