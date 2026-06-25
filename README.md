# Newsroom Lab — Phase 0 Sandbox

Private AI newsroom sandbox for testing one AI journalist before connecting live WordPress sites.

## What this includes

- Next.js dashboard for Netlify
- Netlify Functions backend
- Supabase Postgres database schema
- Supabase Storage support for generated images
- Supabase Auth admin login
- One seeded journalist: **Anika Patel**
- Article artifact trail
- Image brief, prompt, job, and review trail
- Telegram approval buttons
- Structured journalist memory candidates
- Mock mode fallback so the app works before AI keys are added
- WordPress publishing intentionally disabled

## Phase 0 rule

Nothing publishes publicly. Approval only moves an article to `approved_sandbox`.

## Quick start

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Create one Supabase Auth user for yourself.
5. Copy `.env.example` to `.env.local`.
6. Add your Supabase URL, anon key, service role key, and admin email.
7. Run locally:

```bash
npm install
npm run dev
```

8. Deploy to Netlify.
9. Add the same environment variables in Netlify.
10. Add OpenAI or Gemini variables when ready.

## Environment variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=you@example.com
```

### AI brain

Use mock first:

```bash
AI_PROVIDER=mock
```

OpenAI:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_TEXT_MODEL=gpt-4.1-mini
```

Gemini:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_TEXT_MODEL=gemini-2.5-flash
```

### Image generation

Use placeholder first:

```bash
IMAGE_PROVIDER=placeholder
```

OpenAI image generation:

```bash
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
```

### Telegram approval

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=change-this-secret
PUBLIC_BASE_URL=https://your-netlify-site.netlify.app
```

Webhook URL:

```text
https://your-netlify-site.netlify.app/.netlify/functions/telegram-webhook
```

Set webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/.netlify/functions/telegram-webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

## Main flow

1. Login.
2. Go to Dashboard.
3. Enter a topic or leave blank.
4. Click **Create Article Package**.
5. System creates:
   - article
   - artifacts
   - sources
   - image job
   - image review
   - Telegram approval record
6. Review from dashboard or Telegram.
7. Approve, reject, request revision, or regenerate image.
8. Memory candidates appear after feedback/actions.
9. Approve or reject memory candidates manually.

## Production notes

This is a production-ready sandbox scaffold, not the final public publishing system. The WordPress adapter should only be added after one week of safe testing.

Before connecting WordPress:

- Add source discovery using approved sources only.
- Tighten RLS if multiple admins/users are added.
- Replace placeholder images with a proper image provider.
- Add daily scheduled functions if you want autonomous topic suggestions.
- Add WordPress REST API publishing adapter with an explicit off/on safety switch.

## Folder structure

```text
src/app                 Dashboard UI
src/lib                 Browser client helpers
netlify/functions       Backend actions
netlify/functions/_shared Shared server utilities
supabase/schema.sql     Database schema and seed
docs                    Setup and testing docs
```
