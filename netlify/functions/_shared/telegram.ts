import { getSupabaseAdmin } from './supabase';

type TelegramPreviewInput = {
  article_id: string;
  title: string;
  website: string;
  journalist: string;
  section: string;
  summary: string;
  risk_level: string;
  fact_check_status: string;
  bias_check_status: string;
  image_status: string;
  sources: Array<{ title: string; url: string }>;
};

export async function sendTelegramPreview(input: TelegramPreviewInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const baseUrl = process.env.PUBLIC_BASE_URL;

  if (!token || !chatId) {
    await recordApproval(input.article_id, 'telegram_skipped', null, 'Telegram is not configured.');
    return { skipped: true };
  }

  // The sandbox currently renders article details inside the main dashboard.
  // Use a dashboard query param instead of linking to a non-existent /articles/[id] route.
  const articleUrl = baseUrl ? `${baseUrl}/?article=${encodeURIComponent(input.article_id)}` : input.article_id;
  const sourcesText = input.sources.length
    ? input.sources.slice(0, 5).map((s, idx) => `${idx + 1}. ${s.title}: ${s.url}`).join('\n')
    : 'No sources stored.';

  const text = `📰 Article Ready for Sandbox Review\n\nWebsite:\n${input.website}\n\nJournalist:\n${input.journalist}\n\nSection:\n${input.section}\n\nTitle:\n${input.title}\n\nSummary:\n${input.summary}\n\nRisk Level:\n${input.risk_level}\n\nFact Check:\n${input.fact_check_status}\n\nBias Check:\n${input.bias_check_status}\n\nImage Status:\n${input.image_status}\n\nSources:\n${sourcesText}\n\nOpen Sandbox Dashboard:\n${articleUrl}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Approve Sandbox', callback_data: `approve:${input.article_id}` }],
          [{ text: '🖼 Regenerate Image', callback_data: `image:${input.article_id}` }],
          [{ text: '✏️ Request Revision', callback_data: `revise:${input.article_id}` }],
          [{ text: '❌ Reject', callback_data: `reject:${input.article_id}` }]
        ]
      }
    })
  });

  const payload = await res.json() as any;
  if (!res.ok) throw new Error(payload.description || 'Telegram sendMessage failed.');
  const messageId = String(payload.result?.message_id || '');
  await recordApproval(input.article_id, 'awaiting_admin_review', messageId, null);
  return { skipped: false, message_id: messageId };
}

export async function answerCallback(callbackId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !callbackId) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

async function recordApproval(articleId: string, status: string, messageId: string | null, feedback: string | null) {
  const supabase = getSupabaseAdmin();
  await supabase.from('telegram_approvals').insert({
    article_id: articleId,
    approval_status: status,
    telegram_message_id: messageId,
    admin_feedback: feedback
  });
}
