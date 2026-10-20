# Coding Standards

## Naming
- camelCase for variables/functions
- PascalCase for React components/classes
- UPPER_SNAKE_CASE for constants where appropriate
- descriptive names over abbreviations

## Files
Prefer feature-oriented organization.

Example:
features/leads/
  components/
  services/
  schemas/
  types/

## Functions
- small
- single responsibility
- predictable inputs/outputs
- avoid hidden side effects

## Errors
Use typed/known error categories.
Do not expose stack traces to end users.

## Logging
Use structured logs.
Include job/request identifiers.
Never log secrets.

## Database
Do not perform database calls directly in presentational components.

## Comments
Comment why something is necessary, not what obvious code does.

## Dependencies
Before adding a package:
- confirm existing libraries cannot solve it
- assess maintenance/security
- keep dependency count reasonable
