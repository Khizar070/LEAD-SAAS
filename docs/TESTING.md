# Testing Strategy

## Unit Tests
Test:
- lead scoring
- URL normalization
- audit rules
- input validation
- email template generation
- permission checks

## Integration Tests
Test:
- MySQL/Prisma
- API routes
- job creation
- job completion
- external provider adapters with mocks

## End-to-End Tests
Test the critical path:
1. create/import lead
2. start audit
3. audit completes
4. AI analysis completes
5. email draft generated
6. approval required
7. export works

## Security Tests
Test:
- unauthorized lead access
- cross-workspace access
- SSRF protections
- rate limiting
- invalid input
- expired auth/session
- secret leakage

## Definition of Done
A feature is not complete until:
- TypeScript passes
- lint passes
- tests pass
- build passes
- error/loading/empty states exist
- documentation is updated
- no unrelated files are changed
