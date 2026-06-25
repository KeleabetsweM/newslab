# Telegram Setup

## 1. Create bot

1. Open Telegram.
2. Search for `@BotFather`.
3. Create a new bot.
4. Copy the bot token.
5. Add it as `TELEGRAM_BOT_TOKEN`.

## 2. Get your chat ID

Send a message to your bot first, then open:

```text
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

Find your chat ID and add it as:

```bash
TELEGRAM_ADMIN_CHAT_ID=123456789
```

## 3. Set webhook

After deploying to Netlify, set:

```bash
PUBLIC_BASE_URL=https://your-netlify-site.netlify.app
TELEGRAM_WEBHOOK_SECRET=your-secret
```

Then run:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/.netlify/functions/telegram-webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

## 4. Buttons included

- Approve Sandbox
- Regenerate Image
- Request Revision
- Reject

## Important

Telegram approval does not publish publicly. It only changes sandbox status.
