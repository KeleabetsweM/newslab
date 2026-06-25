import type { Handler } from '@netlify/functions';
import { json, parseJson } from './_shared/http';
import { approveArticleSandbox, rejectArticle, requestRevision, regenerateImage } from './_shared/actions';
import { answerCallback } from './_shared/telegram';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const receivedSecret = event.headers['x-telegram-bot-api-secret-token'];
    if (expectedSecret && receivedSecret !== expectedSecret) {
      return json(401, { error: 'Invalid Telegram secret token.' });
    }

    const update = parseJson<any>(event);
    const callback = update.callback_query;
    const data = String(callback?.data || '');
    const [action, articleId] = data.split(':');
    if (!callback?.id || !articleId) return json(200, { ok: true, ignored: true });

    if (action === 'approve') {
      const result = await approveArticleSandbox(articleId, 'Approved from Telegram.');
      await answerCallback(callback.id, result.canApprove ? 'Approved for sandbox.' : 'Checks did not pass. Revision requested.');
    } else if (action === 'reject') {
      await rejectArticle(articleId, 'Rejected from Telegram.');
      await answerCallback(callback.id, 'Rejected.');
    } else if (action === 'revise') {
      await requestRevision(articleId, 'Revision requested from Telegram.');
      await answerCallback(callback.id, 'Revision requested.');
    } else if (action === 'image') {
      await regenerateImage(articleId, 'Image regeneration requested from Telegram.');
      await answerCallback(callback.id, 'Image regenerated.');
    }

    return json(200, { ok: true });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
