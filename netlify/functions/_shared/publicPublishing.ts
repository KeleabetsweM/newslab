import { getSupabaseAdmin } from './supabase';

export interface PublishResult {
  success: boolean;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  publicArticleId?: string;
}

export async function publishArticleToPublic(articleId: string, options: { autoPublish?: boolean } = {}): Promise<PublishResult> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the private article with its journalist
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*, journalists(*)')
    .eq('id', articleId)
    .maybeSingle();

  if (articleError) {
    return { success: false, status: 'failed', reason: `Database error: ${articleError.message}` };
  }
  if (!article) {
    return { success: false, status: 'failed', reason: 'Article not found' };
  }

  const journalist = article.journalists;

  // 2. Fetch the latest completed image job
  const { data: imageJob } = await supabase
    .from('image_jobs')
    .select('image_url')
    .eq('article_id', articleId)
    .eq('generation_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const featuredImage = imageJob?.image_url || null;

  // 3. Define mapping helper for category
  const mapSectionToCategory = (section: string): string => {
    const sec = section.toLowerCase();
    if (sec.includes('food') || sec.includes('market') || sec.includes('family') || sec.includes('kids') || sec.includes('day')) {
      return 'lifestyle';
    }
    if (sec.includes('sport') || sec.includes('adventure') || sec.includes('outdoor')) {
      return 'sports';
    }
    if (sec.includes('music') || sec.includes('gig') || sec.includes('entertainment') || sec.includes('art') || sec.includes('culture')) {
      return 'entertainment';
    }
    if (sec.includes('tech') || sec.includes('startup') || sec.includes('innovation')) {
      return 'technology';
    }
    if (sec.includes('business') || sec.includes('finance') || sec.includes('money')) {
      return 'business';
    }
    return 'general';
  };

  const category = mapSectionToCategory(article.section);

  // 4. Perform eligibility checks (Safety Gates)
  // Low-risk only:
  // - risk_level !== 'high' (allow low and medium)
  // - fact_check_status === 'passed'
  // - bias_check_status === 'passed'
  const isHighRisk = article.risk_level === 'high';
  const hasPassedFactCheck = article.fact_check_status === 'passed';
  const hasPassedBiasCheck = article.bias_check_status === 'passed';

  if (isHighRisk || !hasPassedFactCheck || !hasPassedBiasCheck) {
    const reasons: string[] = [];
    if (isHighRisk) reasons.push('High risk level');
    if (!hasPassedFactCheck) reasons.push(`Fact check status is ${article.fact_check_status}`);
    if (!hasPassedBiasCheck) reasons.push(`Bias check status is ${article.bias_check_status}`);
    const reason = `Eligibility check failed: ${reasons.join(', ')}`;

    // Log the failed publish attempt
    await supabase.from('public_publish_logs').insert({
      article_id: articleId,
      journalist_id: journalist?.id || null,
      action: options.autoPublish ? 'auto_publish' : 'manual_publish',
      status: 'skipped',
      reason,
      metadata: {
        risk_level: article.risk_level,
        fact_check_status: article.fact_check_status,
        bias_check_status: article.bias_check_status
      }
    });

    return { success: false, status: 'skipped', reason };
  }

  // 5. Generate Slug and details
  // Ensure we have a valid body and title
  if (!article.title || !article.body) {
    const reason = 'Article title or body is missing.';
    await supabase.from('public_publish_logs').insert({
      article_id: articleId,
      journalist_id: journalist?.id || null,
      action: options.autoPublish ? 'auto_publish' : 'manual_publish',
      status: 'failed',
      reason,
      metadata: {}
    });
    return { success: false, status: 'failed', reason };
  }

  // Generate unique slug
  let slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // Trim dashes from start/end
  slug = slug.replace(/^-+|-+$/g, '');
  if (!slug) {
    slug = `article-${Date.now()}`;
  }

  // Insert or Update the public article
  const { data: existingPublicArticle } = await supabase
    .from('public_articles')
    .select('id, slug')
    .eq('article_id', articleId)
    .maybeSingle();

  let publicArticleId: string;
  let publishAction = 'publish';

  if (existingPublicArticle) {
    publishAction = 'update';
    const { data: updated, error: updateError } = await supabase
      .from('public_articles')
      .update({
        title: article.title,
        slug: existingPublicArticle.slug, // Keep the same slug to prevent broken links
        summary: article.summary,
        body: article.body,
        featured_image: featuredImage,
        category,
        public_status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPublicArticle.id)
      .select('id')
      .single();

    if (updateError) {
      await supabase.from('public_publish_logs').insert({
        article_id: articleId,
        journalist_id: journalist?.id || null,
        action: options.autoPublish ? 'auto_publish' : 'manual_publish',
        status: 'failed',
        reason: `Failed to update public article: ${updateError.message}`,
        metadata: {}
      });
      return { success: false, status: 'failed', reason: updateError.message };
    }
    publicArticleId = updated.id;
  } else {
    // Check if slug is already taken
    const { data: slugConflict } = await supabase
      .from('public_articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (slugConflict) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('public_articles')
      .insert({
        article_id: articleId,
        journalist_id: article.journalist_id,
        website: 'mzansimashup.co.za',
        title: article.title,
        slug,
        summary: article.summary,
        body: article.body,
        featured_image: featuredImage,
        category,
        tags: [],
        public_status: 'published',
        published_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      await supabase.from('public_publish_logs').insert({
        article_id: articleId,
        journalist_id: journalist?.id || null,
        action: options.autoPublish ? 'auto_publish' : 'manual_publish',
        status: 'failed',
        reason: `Failed to insert public article: ${insertError.message}`,
        metadata: {}
      });
      return { success: false, status: 'failed', reason: insertError.message };
    }
    publicArticleId = inserted.id;
  }

  // 6. Log the success
  await supabase.from('public_publish_logs').insert({
    article_id: articleId,
    public_article_id: publicArticleId,
    journalist_id: journalist?.id || null,
    action: options.autoPublish ? 'auto_publish' : 'manual_publish',
    status: 'success',
    reason: `Successfully published/updated article on Mzansi Mashup (action: ${publishAction}).`,
    metadata: {
      public_article_id: publicArticleId,
      slug,
      category,
      featuredImage
    }
  });

  return { success: true, status: 'success', publicArticleId };
}
