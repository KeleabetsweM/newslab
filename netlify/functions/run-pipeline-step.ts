import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { runPipelineStepForArticle } from './_shared/pipeline';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const { id } = parseJson<{ id: string }>(event);
    if (!id) throw new Error('article_id is required');

    const result = await runPipelineStepForArticle(id);
    return json(200, result);
  } catch (error) {
    console.error('Pipeline error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
