# Architecture

## 1. High-Level Architecture

Browser
→ Next.js application
→ Application services
→ MySQL

Long-running work:
Next.js
→ Redis/BullMQ
→ Node.js worker
→ external services
→ MySQL

## 2. Application Layers

### Presentation
Next.js App Router
- pages
- layouts
- components
- forms
- tables
- charts

### Application
Use-case/service layer:
- lead discovery
- website analysis
- audit
- AI analysis
- scoring
- outreach drafting
- export

### Infrastructure
- Prisma
- MySQL
- Redis
- external APIs
- email provider
- logging

## 3. Suggested Project Structure

src/
  app/
  components/
  features/
    leads/
    audits/
    outreach/
    settings/
  server/
    services/
    repositories/
    integrations/
  lib/
    auth/
    validation/
    logging/
  types/

worker/
  jobs/
  processors/
  integrations/

prisma/
  schema.prisma
  migrations/

docs/
.ai/

## 4. Worker Jobs
Jobs should be idempotent where practical.

Suggested jobs:
- discover_leads
- fetch_website
- run_page_audit
- run_ai_analysis
- calculate_score
- generate_email
- export_leads

## 5. External Integrations
Keep integrations behind service interfaces.

Example:
GooglePlacesProvider
WebsiteCrawler
PageSpeedProvider
AIProvider
EmailProvider

The rest of the application should not depend directly on provider-specific SDK details.

## 6. Architecture Rules
- Do not put long-running browser crawling inside a normal request/response route.
- Do not expose API keys to the browser.
- Validate external data.
- Persist job status.
- Support retry for transient failures.
- Keep AI output structured.
- Keep source evidence separate from generated interpretation.
