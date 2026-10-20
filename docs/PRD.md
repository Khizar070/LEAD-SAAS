# Product Requirements Document

## 1. Product Vision
Build a personal AI-powered lead intelligence system that helps a web development and AI automation provider find businesses with identifiable digital problems and turn those findings into useful, evidence-backed outreach.

## 2. Problem
Manual prospecting requires:
- finding businesses
- opening websites one by one
- checking mobile UX
- checking performance
- checking SEO
- identifying conversion problems
- deciding which service is relevant
- writing personalized outreach

The product should reduce this repetitive research work.

## 3. Target User
Initial user: the owner/operator of the system.

Future users:
- freelancers
- web agencies
- AI automation agencies
- lead-generation teams

## 4. Primary Inputs
The user can define:
- niche
- location
- search radius where supported
- services offered
- audit criteria
- optional ideal-client criteria
- optional outreach tone
- maximum leads to process

Example:
Niche: Dental clinics
Location: London
Services: Website Development + AI Automation

## 5. Core Features

### 5.1 Lead Discovery
Discover relevant businesses from authorized/official business-data sources.

Store, where available and permitted:
- business name
- category
- website
- phone
- address/location
- rating/review count
- source
- source identifier
- discovery timestamp

### 5.2 Website Detection
Determine:
- whether a website exists
- website URL
- whether the URL is reachable
- redirects
- HTTPS
- crawl status

### 5.3 Website Audit
Audit:
- performance
- SEO basics
- mobile/responsive signals
- accessibility basics
- technical signals
- content structure
- conversion/UX signals

### 5.4 AI Opportunity Analysis
Use audit evidence and business context to determine:
- important problems
- evidence
- business implication
- relevant service
- recommended next action

### 5.5 Lead Scoring
Calculate a transparent score from configurable signals.

The score is an internal prioritization mechanism, not a claim about business quality.

### 5.6 Outreach Drafting
Generate personalized email drafts based only on verified/observed information.

Initial version requires manual approval before sending.

### 5.7 Lead Management
- search
- filters
- sorting
- lead status
- notes
- audit status
- outreach status

### 5.8 Export
Export selected leads to CSV/XLSX.

## 6. Non-Goals for MVP
Do not build initially:
- mobile application
- public SaaS signup
- subscription billing
- team management
- white-labeling
- complex CRM
- LinkedIn automation
- WhatsApp automation
- autonomous bulk outreach
- scraping/bypassing anti-bot systems
- large-scale distributed crawling

## 7. Success Criteria
The MVP is successful when the user can:
1. enter a niche and location
2. discover businesses
3. save businesses
4. analyze their websites
5. see evidence-backed issues
6. see relevant service opportunities
7. prioritize leads
8. generate personalized emails
9. manually approve and send/export them
10. export the research data

## 8. Product Principles
- Evidence over assumptions.
- Small, reliable workflows over giant autonomous agents.
- Human approval before initial outreach.
- Keep source data separate from AI interpretation.
- Keep audit rules deterministic where possible.
- AI handles interpretation, not facts that can be measured directly.
