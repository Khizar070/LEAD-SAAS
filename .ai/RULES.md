# AI Coding Agent Rules

## Before Coding
1. Read README.md.
2. Read the relevant docs.
3. Inspect the existing implementation.
4. Identify dependencies and affected modules.
5. State a short implementation plan.
6. Implement only the requested scope.

## General
- Do not rewrite working code without reason.
- Do not modify unrelated files.
- Do not add dependencies without justification.
- Prefer simple solutions.
- Reuse existing components and utilities.
- Keep business logic out of UI components.
- Keep provider-specific code behind integration interfaces.

## TypeScript
- strict mode
- avoid `any`
- explicit types for external data
- validate runtime input

## Database
- Prisma migrations only
- update DATABASE.md when schema changes
- never silently drop data
- maintain indexes and constraints

## API
- validate every external input
- authenticate protected routes
- enforce ownership
- consistent error format
- rate limit expensive endpoints

## AI
- structured output only
- schema validation
- no fabricated facts
- evidence required for audit claims
- prompts are version controlled

## Crawling
- never bypass anti-bot protections
- validate URLs
- enforce timeouts
- protect against SSRF
- bound crawl depth and page count

## UI
- use the existing design system
- include loading/error/empty states
- responsive core workflows
- accessible controls

## Completion
Before declaring a task complete:
- run typecheck
- run lint
- run tests
- run build when appropriate
- report failures honestly
- summarize files changed
