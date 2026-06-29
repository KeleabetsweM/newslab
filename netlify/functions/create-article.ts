import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { createArticleForJournalist } from './_shared/articleLifecycle';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const body = parseJson<{ topic?: string; journalist_id?: string }>(event);
    const topic = body.topic?.trim();
    const journalistId = body.journalist_id?.trim() || 'anika-patel';

    const result = await createArticleForJournalist({ journalistId, topic });
    return json(200, result);
  } catch (error) {
    console.error('Create article error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
