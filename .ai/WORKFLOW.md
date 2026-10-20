# Vibe Coding Workflow

## Rule
Build one small vertical slice at a time.

## Cycle

### 1. Specify
Update CURRENT-TASK.md.

### 2. Inspect
AI reads:
- README
- RULES
- relevant architecture docs
- existing code

### 3. Plan
AI proposes affected files and implementation steps.

### 4. Implement
AI writes only the requested feature.

### 5. Verify
Run:
- typecheck
- lint
- tests
- build if appropriate

### 6. Review
Manually inspect:
- database changes
- security-sensitive code
- external API usage
- UI behavior

### 7. Commit
Use a focused Git commit.

Examples:
feat: add lead discovery
feat: add website audit
fix: prevent duplicate businesses

### 8. Update Docs
If architecture, schema, API or behavior changed, update the relevant markdown.

## Never
- ask the AI to build the whole application in one prompt
- let AI modify unrelated features
- skip Git
- accept failing tests without understanding them
- hardcode API keys
- trust AI-generated facts without evidence
