<!--
Sync Impact Report - Constitution v1.0.0
========================================
Version Change: Initial version → 1.0.0
Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (6 principles total)
    * I. Code Quality Standards
    * II. Testing Standards (NON-NEGOTIABLE)
    * III. User Experience Consistency
    * IV. Performance Requirements
    * V. Security & Data Integrity
    * VI. Maintainability & Documentation
  - Development Workflow (Code Review, Git Workflow, Database Changes)
  - Quality Gates (Pre-Commit, Pre-Merge, Pre-Deployment)
  - Governance (Amendment Process, Version Semantics, Compliance Verification, Constitutional Authority)
Removed Sections: N/A
Templates Status:
  ✅ plan-template.md - Constitution Check section updated with all 6 principles and specific checklists
  ✅ spec-template.md - Review checklist aligned (no changes needed - focuses on business requirements)
  ✅ tasks-template.md - Phase structure aligned (no changes needed - already enforces TDD properly)
  ✅ agent-file-template.md - Structure verified (no changes needed)
Follow-up TODOs: None
-->

# AI Chatbot with Mastra Constitution

## Core Principles

### I. Code Quality Standards

Code MUST meet the following quality benchmarks:
- All code MUST pass ESLint and Biome linting without errors or warnings
- TypeScript strict mode MUST be enabled with no `any` types unless explicitly justified
- All imports MUST use path aliases (`@/*`) for consistency
- Code duplication MUST be eliminated - extract shared logic into reusable utilities
- Component complexity MUST be minimized - single responsibility principle enforced
- All database queries MUST use parameterized statements via Drizzle ORM

**Rationale**: High code quality prevents bugs, improves maintainability, and reduces technical debt. The AI SDK and Next.js ecosystem provide excellent tooling that must be leveraged consistently.

### II. Testing Standards (NON-NEGOTIABLE)

TDD workflow MUST be strictly enforced:
- Tests MUST be written BEFORE implementation
- Tests MUST fail initially (Red phase)
- Implementation makes tests pass (Green phase)
- Code is then refactored (Refactor phase)

Testing requirements by type:
- **Contract Tests**: Required for ALL API endpoints before implementation
- **Integration Tests**: Required for ALL user-facing features and flows
- **Unit Tests**: Required for complex business logic and validation functions
- **E2E Tests**: Playwright tests required for critical user journeys

Test quality standards:
- Tests MUST be deterministic - no flaky tests allowed
- Tests MUST be isolated - no shared state between tests
- Tests MUST validate actual behavior, not implementation details
- Test coverage MUST be maintained above 80% for critical paths

**Rationale**: TDD ensures design quality, prevents regressions, and serves as living documentation. The chatbot's AI interactions require robust testing to ensure reliability.

### III. User Experience Consistency

UX MUST be predictable and cohesive across the application:
- UI components MUST use shadcn/ui primitives exclusively
- Styling MUST use Tailwind CSS - no inline styles or CSS modules
- Loading states MUST be shown for all async operations
- Error messages MUST be user-friendly and actionable
- Accessibility MUST follow WCAG 2.1 AA standards minimum
- Responsive design MUST support mobile, tablet, and desktop viewports
- Dark mode MUST be fully supported via next-themes

Chat-specific UX requirements:
- Streaming responses MUST show real-time updates
- Message history MUST be preserved and loadable
- File uploads MUST show progress indicators
- Tool invocations MUST be visually distinguished
- Artifacts (documents, code) MUST be editable inline

**Rationale**: Consistent UX builds user trust and reduces cognitive load. The AI chat interface is complex - consistency is critical for usability.

### IV. Performance Requirements

Performance benchmarks MUST be met:
- **Time to First Byte (TTFB)**: < 200ms for API routes
- **First Contentful Paint (FCP)**: < 1.8s on 3G
- **Time to Interactive (TTI)**: < 3.5s on 3G
- **API Response Time**: < 500ms p95 for non-AI endpoints
- **AI Streaming**: First token within 1s of request
- **Database Queries**: < 100ms p95 for standard queries
- **Bundle Size**: < 300KB initial JavaScript payload

Optimization requirements:
- Server Components MUST be used by default - Client Components only when needed
- Database connections MUST use connection pooling
- Static assets MUST be cached with appropriate headers
- Images MUST use Next.js Image component with optimization
- Code splitting MUST be applied to large dependencies
- Mastra agent instances MUST use singleton pattern to prevent duplicate connections

**Rationale**: Fast performance is essential for user engagement, especially for AI interactions where response time impacts perceived intelligence.

### V. Security & Data Integrity

Security MUST be non-negotiable:
- Authentication MUST use NextAuth.js v5 with secure session handling
- Passwords MUST be hashed with bcrypt (minimum 10 rounds)
- All database inputs MUST be sanitized via Drizzle ORM
- Environment variables MUST never be exposed to client
- API routes MUST validate request bodies with Zod schemas
- User data MUST respect visibility settings (public/private chats)
- Guest users MUST have limited permissions vs authenticated users

Data integrity requirements:
- Database migrations MUST be reversible
- Data validation MUST occur at schema level (Drizzle + Zod)
- Foreign key constraints MUST enforce referential integrity
- Sensitive data (API keys) MUST never be logged

**Rationale**: Security breaches destroy user trust. Data integrity ensures system reliability. The chatbot handles user conversations - privacy is paramount.

### VI. Maintainability & Documentation

Code MUST be maintainable by the team:
- Complex logic MUST include inline comments explaining "why", not "what"
- Public APIs MUST have JSDoc comments
- Breaking changes MUST be documented in CHANGELOG.md
- Database schema changes MUST be versioned via Drizzle migrations
- Environment variables MUST be documented in .env.example
- New dependencies MUST be justified in PR description

Architecture documentation requirements:
- README.md MUST explain setup, commands, and deployment
- CLAUDE.md MUST be updated when architecture changes
- API contracts MUST be documented in code comments
- Mastra agent configuration MUST document memory and tool setup

**Rationale**: Good documentation reduces onboarding time and prevents knowledge silos. The Mastra integration is complex - clear docs are essential.

## Development Workflow

### Code Review Process

All changes MUST go through PR review:
- PRs MUST pass all CI checks (lint, build, test)
- PRs MUST have descriptive titles and descriptions
- PRs MUST reference related issues or features
- Breaking changes MUST be clearly marked
- At least one approval required before merge

### Git Workflow

Branch naming conventions:
- Features: `feature-[description]`
- Fixes: `fix-[description]`
- Docs: `docs-[description]`

Commit message format:
- Use conventional commits: `type: description`
- Types: feat, fix, docs, test, refactor, perf, chore
- Keep first line under 72 characters
- Add body for complex changes

### Database Changes

Schema changes MUST follow migration workflow:
1. Create migration: `pnpm db:generate`
2. Review generated SQL carefully
3. Test migration locally: `pnpm db:migrate`
4. Verify rollback capability
5. Document breaking changes

## Quality Gates

### Pre-Commit Gates

MUST pass before commit:
- `pnpm lint` - no errors or warnings
- `pnpm format` - code is formatted
- TypeScript compilation succeeds

### Pre-Merge Gates

MUST pass before PR merge:
- All tests pass: `pnpm test`
- Build succeeds: `pnpm build`
- No TypeScript errors
- Code review approved
- Branch up to date with main

### Pre-Deployment Gates

MUST pass before production deployment:
- All staging tests pass
- Database migrations tested
- Environment variables validated
- Performance benchmarks met
- No console errors in critical flows

## Governance

### Amendment Process

Constitution changes require:
1. Proposal with clear rationale
2. Team discussion and consensus
3. Documentation of affected projects
4. Version bump following semantic versioning
5. Update of all dependent templates

### Version Semantics

- **MAJOR** (X.0.0): Backward incompatible principle changes or removals
- **MINOR** (x.Y.0): New principles added or existing ones materially expanded
- **PATCH** (x.y.Z): Clarifications, wording improvements, non-semantic fixes

### Compliance Verification

All PRs and reviews MUST:
- Verify adherence to applicable principles
- Justify any deviations with clear reasoning
- Update relevant documentation when principles evolve
- Flag complexity increases for team discussion

**Principle Violations**: Any violation MUST be documented in the Complexity Tracking section of plan.md with justification and proof that simpler alternatives were considered.

### Constitutional Authority

This constitution supersedes all other development practices. When conflicts arise:
1. Constitution takes precedence
2. If constitution is unclear, discuss amendment
3. If amendment needed, follow amendment process
4. Emergency deviations require post-hoc documentation

**Version**: 1.0.0 | **Ratified**: 2025-10-02 | **Last Amended**: 2025-10-02
