import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';
import { publishArticleToPublic } from './_shared/publicPublishing';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate the admin
    await requireAdmin(event);

    // 2. Parse request body
    const body = JSON.parse(event.body || '{}');
    const { articleId, action = 'publish' } = body;

    if (!articleId) {
      return json(400, { error: 'Missing articleId' });
    }

    const supabase = getSupabaseAdmin();

    if (action === 'unpublish') {
      // 1. Fetch the public article
      const { data: publicArticle, error: fetchError } = await supabase
        .from('public_articles')
        .select('id, journalist_id')
        .eq('article_id', articleId)
        .maybeSingle();

      if (fetchError) {
        return json(500, { error: `Database error: ${fetchError.message}` });
      }

      if (!publicArticle) {
        return json(404, { error: 'Article is not published on Mzansi Mashup' });
      }

      // 2. Update status to unpublished
      const { error: updateError } = await supabase
        .from('public_articles')
        .update({
          public_status: 'unpublished',
          unpublished_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', publicArticle.id);

      if (updateError) {
        return json(500, { error: `Failed to unpublish: ${updateError.message}` });
      }

      // 3. Log the unpublish event
      await supabase.from('public_publish_logs').insert({
        article_id: articleId,
        public_article_id: publicArticle.id,
        journalist_id: publicArticle.journalist_id,
        action: 'manual_unpublish',
        status: 'success',
        reason: 'Manually unpublished by administrator.',
        metadata: {}
      });

      return json(200, { success: true, message: 'Article manually unpublished successfully.' });
    } else if (action === 'publish') {
      const result = await publishArticleToPublic(articleId, { autoPublish: false });
      if (!result.success) {
        return json(400, {
          error: result.reason || 'Publishing eligibility check failed.',
          status: result.status
        });
      }
      return json(200, {
        success: true,
        message: 'Article published successfully to Mzansi Mashup.',
        publicArticleId: result.publicArticleId
      });
    } else {
      return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Publish handler error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
