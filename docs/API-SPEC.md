# API Specification

## General
- Use REST-style endpoints initially.
- Validate all input with a schema validator.
- Authenticate protected routes.
- Return consistent JSON errors.
- Never expose secrets.
- Add rate limits to expensive endpoints.

## Lead Discovery

POST /api/leads/discover

Input:
- niche
- location
- radius
- max_results

Output:
- job_id

GET /api/jobs/:id

Returns job status.

## Leads

GET /api/leads
POST /api/leads
GET /api/leads/:id
PATCH /api/leads/:id
DELETE /api/leads/:id

Filters:
- search
- location
- audit status
- opportunity level
- outreach status

## Website Audit

POST /api/leads/:id/audit

Returns:
- job_id

GET /api/audits/:id

Returns:
- status
- scores
- issues
- evidence
- opportunities

## AI Analysis

POST /api/audits/:id/analyze

Returns:
- job_id

## Outreach

POST /api/leads/:id/generate-email

Input:
- tone
- service_focus
- optional user notes

Returns:
- subject
- body

POST /api/outreach/:id/approve

POST /api/outreach/:id/send

## Export

POST /api/leads/export

Input:
- filters
- selected lead IDs

Returns:
- export job or generated file reference

## Error Format

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
