# UI/UX Specification

## Design
Premium B2B SaaS-style interface:
- clean
- professional
- minimal
- information-dense but readable
- responsive
- accessible

Do not use decorative UI that does not improve workflow.

## Navigation
- Dashboard
- Leads
- Audits
- Campaigns
- Analytics
- Settings

## Dashboard
Cards:
- Total Leads
- Audited
- High Opportunity
- Draft Emails
- Sent
- Replies

Sections:
- Recent high-priority leads
- Audit activity
- Outreach activity

## Leads Page
Features:
- search
- filters
- sorting
- pagination
- bulk selection
- audit action
- email generation
- export

Columns:
- Business
- Location
- Website
- Audit Score
- Opportunity
- Recommended Service
- Outreach Status
- Actions

## Lead Detail
Show:
- business information
- website
- audit scores
- issue list
- evidence
- screenshots
- AI opportunity analysis
- recommended service
- email draft
- notes
- timeline

## Audit Page
Sections:
- overall score
- performance
- SEO
- mobile
- accessibility
- technical
- UX
- issues
- evidence

## States
Every asynchronous UI must have:
- loading state
- empty state
- error state
- success state

## Responsive
Desktop is primary, but core workflows must remain usable on tablet/mobile.

## Design System
Use reusable components.
Do not create duplicate button, modal, table, badge or form implementations.
