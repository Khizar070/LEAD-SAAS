# Future SaaS Conversion

Do not implement these features in the personal MVP unless needed:
- public registration
- subscription billing
- teams
- role management
- usage billing
- tenant admin
- public API

## Existing Foundations That Must Support SaaS Later

### Workspace ownership
Core business data should belong to a workspace.

### Service interfaces
External providers should be replaceable.

### Job system
Long-running tasks should already use jobs/workers.

### Audit configuration
Audit rules should be configurable rather than hardcoded everywhere.

### AI prompts
Prompt versions should be stored in source control.

### Usage tracking
It is acceptable to add internal usage counters later without redesigning the domain.

## SaaS Conversion Sequence
1. Add production authentication.
2. Add organizations/workspaces.
3. Add membership and roles.
4. Enforce tenant isolation.
5. Add billing.
6. Add quotas/usage limits.
7. Add onboarding.
8. Add admin tooling.
9. Add production monitoring.
