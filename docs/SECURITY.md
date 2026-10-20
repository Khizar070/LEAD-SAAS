# Security Requirements

## Secrets
- Store secrets only in environment variables or secret storage.
- Never commit API keys.
- Never expose server secrets to client bundles.

## Authentication
If custom authentication is implemented:
- use Argon2id or another modern password hashing scheme
- secure HttpOnly cookies
- Secure cookies in production
- SameSite protection
- email verification
- password reset tokens with expiration
- rate limit login attempts

## Authorization
Every protected data access must verify ownership/workspace scope.

Never trust a workspace_id supplied by the browser without checking ownership.

## API
- validate all inputs
- validate URL targets
- rate limit expensive operations
- limit request body size
- avoid unsafe dynamic SQL
- use Prisma parameterized queries

## SSRF Protection
Website crawling is an SSRF-sensitive feature.

Block:
- localhost
- loopback addresses
- private IP ranges
- link-local addresses
- cloud metadata endpoints
- internal hostnames where applicable

Re-check resolved IPs after redirects.

## External Content
Treat website HTML, emails and AI-generated text as untrusted data.

Do not execute arbitrary scripts from crawled pages in the application context.

## Logging
Do not log:
- passwords
- API keys
- session tokens
- sensitive email credentials

## Database
- use least-privilege database credentials
- migrations are version-controlled
- backups must be considered before production

## File Uploads
If screenshots/files are uploaded:
- validate MIME/type
- enforce size limits
- randomize stored filenames
- prevent executable content

## Security Review
Before production:
- dependency audit
- auth review
- authorization review
- SSRF review
- API rate-limit review
- secret scan
