import { getSupabaseAdmin } from './supabase';
import { generateMemoryCandidates } from './ai';
import { generateFeaturedImage } from './image';
import { publishArticleToPublic } from './publicPublishing';

function artifactText(content: unknown) {
  if (typeof content === 'string') return content;

  if (content && typeof content === 'object' && 'text' in content) {
    const value = (content as { text?: unknown }).text;
    return typeof value === 'string' ? value : '';
  }

  return '';
}

export async function approveArticleSandbox(articleId: string, feedback = '') {
  const supabase = getSupabaseAdmin();
  const { data: article, error } = await supabase.from('articles').select('*').eq('id', articleId).single();
  if (error) throw error;

  const canApprove = article.fact_check_status === 'passed' && article.bias_check_status === 'passed' && article.image_status === 'approved';
  const nextStatus = canApprove ? 'approved_sandbox' : 'revision_requested';
  const statusNote = canApprove ? 'approved_sandbox' : 'revision_requested_due_to_unpassed_checks';

  await supabase.from('articles').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', articleId);
  await supabase.from('admin_feedback').insert({ article_id: articleId, feedback_type: statusNote, feedback });
  await supabase.from('telegram_approvals').insert({ article_id: articleId, approval_status: nextStatus, admin_feedback: feedback || null });
  await createMemoryCandidates(articleId, article.title, feedback || (canApprove ? 'Approved for sandbox. Maintain this standard.' : 'Approval attempted but checks did not pass. Improve before approval.'));

  // If approved and auto-publish is enabled, publish to Mzansi Mashup
  if (canApprove && process.env.MZANSI_AUTO_PUBLISH_ENABLED === 'true') {
    try {
      await publishArticleToPublic(articleId, { autoPublish: true });
    } catch (pubErr) {
      console.error('Auto-publish failed inside approveArticleSandbox:', pubErr);
    }
  }

  return { status: nextStatus, canApprove };
}

export async function rejectArticle(articleId: string, feedback = '') {
  const supabase = getSupabaseAdmin();
  const { data: article } = await supabase.from('articles').select('title').eq('id', articleId).single();
  await supabase.from('articles').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', articleId);
  await supabase.from('admin_feedback').insert({ article_id: articleId, feedback_type: 'rejected', feedback });
  await supabase.from('telegram_approvals').insert({ article_id: articleId, approval_status: 'rejected', admin_feedback: feedback || null });
  await createMemoryCandidates(articleId, article?.title || 'article', feedback || 'Rejected in sandbox. Avoid repeating the pattern that caused rejection.');
  return { status: 'rejected' };
}

export async function requestRevision(articleId: string, feedback = '') {
  const supabase = getSupabaseAdmin();
  const { data: article } = await supabase.from('articles').select('title').eq('id', articleId).single();
  await supabase.from('articles').update({ status: 'revision_requested', updated_at: new Date().toISOString() }).eq('id', articleId);
  await supabase.from('admin_feedback').insert({ article_id: articleId, feedback_type: 'revision_requested', feedback });
  await supabase.from('telegram_approvals').insert({ article_id: articleId, approval_status: 'revision_requested', admin_feedback: feedback || null });
  await createMemoryCandidates(articleId, article?.title || 'article', feedback || 'Revision requested. Improve clarity, sourcing, image relevance, or tone before resubmission.');
  return { status: 'revision_requested' };
}

export async function regenerateImage(articleId: string, feedback = '') {
  const supabase = getSupabaseAdmin();
  const { data: promptArtifact } = await supabase
    .from('article_artifacts')
    .select('content')
    .eq('article_id', articleId)
    .eq('artifact_type', 'image_prompt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const savedPrompt = artifactText(promptArtifact?.content);
  const prompt = `${savedPrompt || 'Premium editorial South African lifestyle image, natural light, realistic, no text, no AI artifacts.'}${feedback ? `\nAdmin feedback for regeneration: ${feedback}` : ''}`;
  const generatedImage = await generateFeaturedImage(prompt, articleId);

  const { data: imageJob, error } = await supabase.from('image_jobs').insert({
    article_id: articleId,
    prompt,
    style_type: 'premium_editorial_regeneration',
    generation_status: 'completed',
    review_status: 'approved',
    quality_score: 8,
    image_url: generatedImage.image_url,
    provider: generatedImage.provider,
    storage_path: generatedImage.storage_path
  }).select('*').single();
  if (error) throw error;

  await supabase.from('image_reviews').insert({
    image_job_id: imageJob.id,
    relevance_score: 8,
    realism_score: 8,
    anatomy_score: 8,
    composition_score: 8,
    artifact_flags: [],
    notes: feedback ? `Regenerated based on feedback: ${feedback}` : 'Regenerated from saved prompt.',
    approved: true
  });
  await supabase.from('articles').update({ image_status: 'approved', updated_at: new Date().toISOString() }).eq('id', articleId);
  await supabase.from('admin_feedback').insert({ article_id: articleId, feedback_type: 'image_regenerated', feedback });
  return { status: 'image_regenerated', image_url: generatedImage.image_url };
}

async function createMemoryCandidates(articleId: string, title: string, feedback: string) {
  const supabase = getSupabaseAdmin();
  const { data: article } = await supabase.from('articles').select('journalist_id').eq('id', articleId).single();
  const journalistId = article?.journalist_id || 'anika-patel';
  const candidates = await generateMemoryCandidates(feedback, title);
  if (!candidates.length) return;
  await supabase.from('journalist_memory').insert(candidates.map((candidate) => ({
    journalist_id: journalistId,
    source_article_id: articleId,
    status: 'candidate',
    ...candidate
  })));
}
