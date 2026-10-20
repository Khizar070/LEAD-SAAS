# Environment Variables

Never commit `.env` files containing real secrets.

Example `.env.example`:

DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"

OPENAI_API_KEY=""

GOOGLE_MAPS_API_KEY=""

REDIS_URL=""

EMAIL_API_KEY=""

APP_URL="http://localhost:3000"

## Rules
- `.env.example` contains placeholders only.
- `.env.local` stays local.
- production secrets use the hosting provider's secret manager/environment settings.
- never print secrets in logs.
