# OpenAI / Gemini Setup

## Mock mode first

Start with:

```bash
AI_PROVIDER=mock
IMAGE_PROVIDER=placeholder
```

This proves the dashboard, database, image flow, and Telegram approval work before spending on API calls.

## OpenAI brain

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_TEXT_MODEL=gpt-4.1-mini
```

## Gemini brain

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_TEXT_MODEL=gemini-2.5-flash
```

## OpenAI image generation

```bash
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Editorial warning

AI-generated articles should still be manually reviewed. Memory can guide style, but it must never replace current source verification.
