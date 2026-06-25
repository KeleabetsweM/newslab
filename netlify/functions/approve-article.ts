import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { approveArticleSandbox } from './_shared/actions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const { article_id, feedback } = parseJson<{ article_id: string; feedback?: string }>(event);
    if (!article_id) throw new Error('article_id is required');
    const result = await approveArticleSandbox(article_id, feedback || '');
    return json(200, result);
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
