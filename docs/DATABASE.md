# Database Design

## Database
MySQL 8

## ORM
Prisma

## Future SaaS Compatibility
Although this is currently a personal application, major domain tables should support a `workspace_id` ownership boundary.

Initially there can be one workspace owned by the user.

## Core Tables

### users
- id
- email
- name
- password_hash (only if custom auth is implemented)
- email_verified_at
- created_at
- updated_at

### workspaces
- id
- name
- owner_user_id
- created_at
- updated_at

### businesses
- id
- workspace_id
- source
- source_place_id
- name
- category
- website_url
- phone
- address
- city
- country
- latitude
- longitude
- rating
- review_count
- discovered_at
- created_at
- updated_at

### websites
- id
- business_id
- normalized_url
- final_url
- http_status
- https
- reachable
- crawl_status
- last_crawled_at
- created_at
- updated_at

### audits
- id
- website_id
- status
- performance_score
- seo_score
- accessibility_score
- mobile_score
- technical_score
- ux_score
- overall_score
- started_at
- completed_at
- error_message
- created_at

### audit_issues
- id
- audit_id
- category
- rule_code
- severity
- title
- description
- evidence
- recommendation
- source
- created_at

### audit_evidence
- id
- audit_id
- type
- key
- value
- source
- created_at

### opportunity_analyses
- id
- business_id
- audit_id
- summary
- opportunity_level
- confidence
- created_at
- updated_at

### opportunities
- id
- analysis_id
- category
- title
- evidence
- business_implication
- recommended_service
- priority
- created_at

### campaigns
- id
- workspace_id
- name
- status
- created_at
- updated_at

### campaign_leads
- id
- campaign_id
- business_id
- status
- added_at

### outreach_messages
- id
- campaign_id
- business_id
- subject
- body
- status
- approved_at
- sent_at
- provider_message_id
- created_at
- updated_at

### outreach_events
- id
- outreach_message_id
- event_type
- event_time
- metadata_json

### suppression_contacts
- id
- workspace_id
- email
- reason
- created_at

### jobs
- id
- type
- status
- payload_json
- attempts
- error_message
- started_at
- completed_at
- created_at

## Constraints
- Add foreign keys.
- Add unique constraints where logically appropriate.
- Add indexes for workspace_id, website_url, source_place_id, status and created_at.
- Never store plaintext passwords.
- Avoid duplicate businesses from the same source identifier.
