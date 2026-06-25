import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson, slugify } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';
import { generateArticlePackage } from './_shared/ai';
import { generateFeaturedImage } from './_shared/image';
import { sendTelegramPreview } from './_shared/telegram';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const body = parseJson<{ topic?: string }>(event);
    const topic = body.topic?.trim();
    const supabase = getSupabaseAdmin();

    const { data: journalist, error: journalistError } = await supabase
      .from('journalists')
      .select('*')
      .eq('id', 'anika-patel')
      .maybeSingle();

    if (journalistError) throw journalistError;
    if (!journalist) throw new Error('Anika Patel journalist seed is missing. Run supabase/schema.sql first.');

    const { data: memoryRows } = await supabase
      .from('journalist_memory')
      .select('memory_content')
      .eq('journalist_id', 'anika-patel')
      .eq('status', 'approved')
      .limit(20);

    const memories = (memoryRows || []).map((m: any) => m.memory_content as string);
    const pack = await generateArticlePackage(topic, memories);
    const slug = slugify(pack.title);

    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        journalist_id: 'anika-patel',
        website: journalist.website,
        section: pack.section,
        topic: topic || pack.storyIdea,
        title: pack.title,
        slug,
        summary: pack.summary,
        body: pack.editedArticle,
        status: 'image_pending',
        risk_level: pack.riskLevel,
        fact_check_status: pack.factCheck.status,
        bias_check_status: pack.biasCheck.status,
        image_status: 'pending'
      })
      .select('*')
      .single();

    if (articleError) throw articleError;

    await supabase.from('agent_logs').insert({ article_id: article.id, agent_name: 'Anika Patel', action: 'create_article_package', output: pack });

    const artifacts = [
      ['story_idea', 'Story idea', pack.storyIdea],
      ['research_notes', 'Research notes', pack.researchNotes],
      ['outline', 'Article outline', pack.outline],
      ['draft_article', 'Draft article', pack.draftArticle],
      ['edited_article', 'Edited article', pack.editedArticle],
      ['fact_check_report', 'Fact-check report', pack.factCheck],
      ['bias_check_report', 'Bias-check report', pack.biasCheck],
      ['image_brief', 'Image brief', pack.imageBrief],
      ['image_prompt', 'Image prompt', pack.imagePrompt],
      ['image_quality_review', 'Image quality review', pack.imageReview]
    ].map(([artifact_type, title, content]) => ({ article_id: article.id, artifact_type, title, content }));

    await supabase.from('article_artifacts').insert(artifacts);

    if (pack.sources.length) {
      await supabase.from('sources').insert(pack.sources.map((source) => ({
        article_id: article.id,
        title: source.title,
        url: source.url,
        publisher: source.publisher || null,
        reliability_score: source.reliability_score || null,
        notes: source.notes || null
      })));
    }

    const generatedImage = await generateFeaturedImage(pack.imagePrompt, article.id);

    const { data: imageJob, error: imageJobError } = await supabase.from('image_jobs').insert({
      article_id: article.id,
      prompt: pack.imagePrompt,
      style_type: 'premium_editorial_south_african_lifestyle',
      generation_status: 'completed',
      review_status: pack.imageReview.status,
      quality_score: pack.imageReview.quality_score,
      image_url: generatedImage.image_url,
      provider: generatedImage.provider,
      storage_path: generatedImage.storage_path
    }).select('*').single();

    if (imageJobError) throw imageJobError;

    await supabase.from('image_reviews').insert({
      image_job_id: imageJob.id,
      relevance_score: 8,
      realism_score: 8,
      anatomy_score: 8,
      composition_score: 8,
      artifact_flags: pack.imageReview.flags,
      notes: pack.imageReview.notes,
      approved: pack.imageReview.status === 'approved'
    });

    const imageStatus = pack.imageReview.status === 'approved' ? 'approved' : 'needs_regeneration';
    await supabase.from('articles').update({ status: 'awaiting_admin_review', image_status: imageStatus }).eq('id', article.id);

    await sendTelegramPreview({
      article_id: article.id,
      title: pack.title,
      website: journalist.website,
      journalist: journalist.name,
      section: pack.section,
      summary: pack.summary,
      risk_level: pack.riskLevel,
      fact_check_status: pack.factCheck.status,
      bias_check_status: pack.biasCheck.status,
      image_status: imageStatus,
      sources: pack.sources.map((s) => ({ title: s.title, url: s.url }))
    });

    return json(200, { article_id: article.id, status: 'awaiting_admin_review' });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
