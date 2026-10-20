# Website Audit Engine

## Goal
Produce deterministic, evidence-backed website findings that can later be interpreted by AI.

## Principle
If a rule cannot produce evidence, it should not report the issue.

## Categories

### A. Performance
Collect:
- Lighthouse performance score
- LCP
- CLS
- INP when available
- transfer size
- image-related signals
- render-blocking/resource signals
- basic page-load signals

### B. SEO
Check:
- title
- title length
- meta description
- meta description presence
- H1 presence/count
- heading structure
- canonical
- robots.txt availability
- sitemap availability
- indexability-related signals where observable
- structured data presence
- Open Graph basics

### C. Mobile
Check:
- viewport meta tag
- horizontal overflow where detectable
- responsive layout signals
- mobile screenshot
- CTA visibility
- text readability signals

### D. Accessibility
Check basic automated signals:
- missing alt attributes
- form labels
- contrast findings when tool provides them
- landmark/basic semantic issues
- keyboard-related automated findings when available

### E. Technical
Check:
- HTTPS
- redirect chain
- broken internal links
- obvious 4xx/5xx responses
- robots.txt
- sitemap
- favicon
- console errors where useful
- mixed-content signals

### F. UX / Conversion
Use deterministic signals where possible:
- presence of primary CTA
- contact information visibility
- booking/contact path
- navigation structure
- trust signals
- service clarity

UX findings that require visual judgment should be passed to AI as observations/screenshots, not presented as deterministic facts.

## Evidence Format
Every finding should contain:
- rule_code
- category
- severity
- title
- evidence
- source
- recommendation

Example:
Rule: SEO_TITLE_MISSING
Evidence: `<title>` element not found
Source: homepage HTML
Recommendation: Add a descriptive page title.

## Severity
- critical
- high
- medium
- low
- info

Severity must be based on defined rules, not arbitrary AI judgment.

## Screenshots
For visual analysis:
- capture desktop screenshot
- capture mobile screenshot
- store only when necessary
- record viewport dimensions
- associate screenshot with audit

## Crawl Safety
- Respect applicable crawling restrictions and provider terms.
- Do not bypass CAPTCHAs or anti-bot systems.
- Set timeouts.
- Limit page depth for MVP.
- Avoid crawling unbounded URLs.
- Prevent SSRF risks by validating target URLs and blocking private/internal network destinations.

## Audit Output
The engine returns structured JSON/database records, not prose-only output.
