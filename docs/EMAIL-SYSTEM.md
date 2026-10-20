# Email System

## MVP Principle
Email generation and sending are separate.

Flow:
Lead
→ Audit
→ AI draft
→ Human review
→ Approval
→ Send
→ Event tracking

## Email Generation Inputs
- business name
- verified website facts
- audit evidence
- relevant service
- optional user notes
- selected tone

## Email Rules
- concise
- specific
- evidence-based
- no fabricated personalization
- one clear call to action
- no misleading claims

## Sending
Use a dedicated email provider/API or authorized mailbox integration.

Do not store mailbox passwords in the database.

## Statuses
- draft
- approved
- queued
- sent
- bounced
- replied
- unsubscribed
- failed

## Suppression
Before every send:
1. normalize email
2. check suppression list
3. check campaign status
4. check user approval
5. send

If suppressed, do not send.

## Tracking
Store provider event IDs and timestamps where available.
Do not rely on open tracking as the only success metric.
