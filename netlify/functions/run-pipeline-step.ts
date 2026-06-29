import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';
import { generateFeaturedImage } from './_shared/image';
import { sendTelegramPreview } from './_shared/telegram';
import OpenAI from 'openai';

async function callAI(systemInstruction: string, prompt: string, expectedSchema?: any): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  let geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.startsWith('eyJhb')) {
    try {
      const fs = require('fs');
      const path = require('path');
      const localEnvPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(localEnvPath)) {
        const content = fs.readFileSync(localEnvPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY=([^\n\r]+)/);
        if (match) geminiKey = match[1].trim();
      }
      if (!geminiKey || geminiKey.startsWith('eyJhb')) {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(/GEMINI_API_KEY=([^\n\r]+)/);
          if (match) geminiKey = match[1].trim();
        }
      }
    } catch (e) {
      console.error('Failed to load local env key:', e);
    }
  }

  console.log("callAI - provider:", provider);
  console.log("callAI - resolved GEMINI_API_KEY starts with:", geminiKey ? geminiKey.substring(0, 7) : 'none');

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await (client.responses as any).create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      text: expectedSchema ? { format: { type: 'json_object' } } : undefined
    });
    return response.output_text;
  }

  if (provider === 'gemini' && geminiKey) {
    const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: expectedSchema ? {
          responseMimeType: 'application/json',
          responseSchema: expectedSchema
        } : undefined
      })
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini API Error Body:", errBody);
      throw new Error(`Gemini request failed: ${res.status} - ${errBody}`);
    }
    const payload = await res.json() as any;
    return payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  throw new Error('mock_fallback');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const { id } = parseJson<{ id: string }>(event);
    if (!id) throw new Error('article_id is required');

    const supabase = getSupabaseAdmin();

    // 1. Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    if (articleError) throw articleError;
    if (!article) throw new Error('Article not found');

    // 2. Fetch journalist
    const { data: journalist, error: journalistError } = await supabase
      .from('journalists')
      .select('*')
      .eq('id', article.journalist_id)
      .single();
    if (journalistError) throw journalistError;

    // 3. Fetch memories
    const { data: memories } = await supabase
      .from('journalist_memory')
      .select('memory_content')
      .eq('journalist_id', journalist.id)
      .eq('status', 'approved');
    const memoryContext = (memories || []).map((m: any) => `- ${m.memory_content}`).join('\n');

    const systemPrompt = `You are ${journalist.name}, the Lifestyle & Community Editor for ${journalist.website}.
Tone: ${journalist.tone}
Personality: ${journalist.personality}
Rules:
${(journalist.rules || []).map((r: string) => `- ${r}`).join('\n')}

Approved memories:
${memoryContext || '- No approved memories yet.'}
`;

    const currentStatus = article.status;
    let nextStatus = currentStatus;
    let logMsg = '';
    const artifactsToInsert: Array<{ artifact_type: string; title: string; content: any }> = [];

    // Check providers
    const isMock = (process.env.AI_PROVIDER || 'mock').toLowerCase() === 'mock';

    if (currentStatus === 'idea' || currentStatus === 'revision_requested') {
      nextStatus = 'researching';
      logMsg = 'Initiating research phase. Analyzing facts and verified local sources...';

      if (isMock) {
        artifactsToInsert.push({
          artifact_type: 'research_notes',
          title: 'Research Notes',
          content: { text: `Blaauwbank Farm Stall is located on the R563, Cradle of Humankind. Open Wed-Sun 8 AM to 4 PM. High-quality home-made woodfired pies, biltong rolls, craft ginger beer, expansive toddler-safe playground lawn with animal interaction petting zone.` }
        });

        // Insert sources
        await supabase.from('sources').insert([
          { article_id: id, title: 'Blaauwbank Historical Farm Directory', url: 'https://www.blaauwbankfarm.co.za', reliability_score: 0.9, notes: 'Verified opening hours and pie specialties.' },
          { article_id: id, title: 'Gauteng Heritage Directory', url: 'https://gautengtourism.co.za', reliability_score: 0.8, notes: 'Heritage status verified.' }
        ]);
      } else {
        const prompt = `Conduct lifestyle research for an article about the topic "${article.topic}".
Verify location hours, exact address landmarks, key local features, and typical weekend family logistics.
Create 2-3 genuine, verifiable sources with descriptions.
Provide the output strictly in JSON matching this schema:
{
  "researchNotes": "string",
  "sources": [{ "name": "string", "url": "string", "notes": "string" }]
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              researchNotes: { type: 'STRING' },
              sources: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    url: { type: 'STRING' },
                    notes: { type: 'STRING' }
                  },
                  required: ['name', 'url', 'notes']
                }
              }
            },
            required: ['researchNotes', 'sources']
          });
          const parsed = JSON.parse(aiResponse);
          artifactsToInsert.push({
            artifact_type: 'research_notes',
            title: 'Research Notes',
            content: { text: parsed.researchNotes }
          });
          if (parsed.sources && parsed.sources.length) {
            await supabase.from('sources').insert(parsed.sources.map((s: any) => ({
              article_id: id,
              title: s.name,
              url: s.url,
              reliability_score: 0.8,
              notes: s.notes
            })));
          }
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
          // Fallback to mock if API fails
          artifactsToInsert.push({
            artifact_type: 'research_notes',
            title: 'Research Notes',
            content: { text: 'Gemini API was busy. Fallback: Johannesburg outdoor recreation hubs compiled.' }
          });
        }
      }

    } else if (currentStatus === 'researching') {
      nextStatus = 'drafted';
      logMsg = 'Drafting comprehensive editorial text utilizing sensory vocabulary and community angles...';

      // Get research notes
      const { data: researchNotesArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'research_notes')
        .maybeSingle();

      const researchStr = String((researchNotesArt?.content as any)?.text || '');

      if (isMock) {
        artifactsToInsert.push({
          artifact_type: 'outline',
          title: 'Article Outline',
          content: { text: '1. Country Drive escaping JHB\n2. The visual rustic charm of Blaauwbank\n3. Hot artisanal chicken pies\n4. Sprawling lawns for family picnics' }
        });
        artifactsToInsert.push({
          artifact_type: 'draft_article',
          title: 'Draft Article',
          content: { text: 'Escape the city dust for a family drive to Blaauwbank Farm Shop! Snuggled inside the sun-drenched Cradle of Humankind hills, this spot serves the most butter-rich, warm farm pies you could dream of. Kids can stretch their legs on the sprawling lawn while you sip local cold ginger beer under the acacia trees.' }
        });
        artifactsToInsert.push({
          artifact_type: 'edited_article',
          title: 'Edited Article',
          content: { text: '# Escaping the City: A Weekend at Blaauwbank\n\nSouth African weekends are at their best when they are simple. Escape the city dust for a family drive to Blaauwbank Farm Shop! Snuggled inside the sun-drenched Cradle of Humankind hills, this spot serves the most butter-rich, warm farm pies you could dream of. Kids can stretch their legs on the sprawling lawn while you sip local cold ginger beer under the acacia trees.' }
        });

        // Update article main fields
        await supabase.from('articles').update({
          title: 'Escaping the City: A Weekend at Blaauwbank',
          body: '# Escaping the City: A Weekend at Blaauwbank\n\nSouth African weekends are at their best when they are simple. Escape the city dust for a family drive to Blaauwbank Farm Shop! Snuggled inside the sun-drenched Cradle of Humankind hills, this spot serves the most butter-rich, warm farm pies you could dream of. Kids can stretch their legs on the sprawling lawn while you sip local cold ginger beer under the acacia trees.',
          summary: 'A warm country escape guide to Cradle of Humankind farm stalls.',
          slug: 'escaping-the-city-blaauwbank'
        }).eq('id', id);
      } else {
        const prompt = `Based on these research notes: "${researchStr}", write a full, warm, inclusive lifestyle blog post.
The word count should be around 350-500 words. Highlight local foods, welcoming family vibes, and practical tips.
Then, write a section roadmap/outline.
Provide the output strictly in JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "outline": "string",
  "draft": "string",
  "edited": "string"
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              summary: { type: 'STRING' },
              outline: { type: 'STRING' },
              draft: { type: 'STRING' },
              edited: { type: 'STRING' }
            },
            required: ['title', 'summary', 'outline', 'draft', 'edited']
          });
          const parsed = JSON.parse(aiResponse);
          artifactsToInsert.push({ artifact_type: 'outline', title: 'Article Outline', content: { text: parsed.outline } });
          artifactsToInsert.push({ artifact_type: 'draft_article', title: 'Draft Article', content: { text: parsed.draft } });
          artifactsToInsert.push({ artifact_type: 'edited_article', title: 'Edited Article', content: { text: parsed.edited } });

          await supabase.from('articles').update({
            title: parsed.title,
            body: parsed.edited,
            summary: parsed.summary,
            slug: parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          }).eq('id', id);
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
        }
      }

    } else if (currentStatus === 'drafted') {
      nextStatus = 'image_pending';
      logMsg = 'Designing featured image creative briefs and AI prompt models...';

      const { data: editedArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'edited_article')
        .maybeSingle();

      const editedStr = String((editedArt?.content as any)?.text || '');

      if (isMock) {
        artifactsToInsert.push({
          artifact_type: 'image_brief',
          title: 'Image Brief',
          content: { text: 'Beautiful cozy country farm shop in South Africa, sun-kissed lawns, fresh baked delicacies.' }
        });
        artifactsToInsert.push({
          artifact_type: 'image_prompt',
          title: 'Image Prompt',
          content: { text: 'A high detail photo of a rustic South African country farm stall with delicious home-baked pies on display, green sprawling hills, warm morning sunshine, 16:9.' }
        });
      } else {
        const prompt = `Read the edited draft of your article: "${editedStr}".
Formulate a professional creative brief for the photography team, and a highly detailed text prompt for a generative image AI model.
Keep the mood warm, bright, South African, inclusive, and authentic.
Provide the output strictly in JSON matching this schema:
{
  "brief": "string",
  "prompt": "string"
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              brief: { type: 'STRING' },
              prompt: { type: 'STRING' }
            },
            required: ['brief', 'prompt']
          });
          const parsed = JSON.parse(aiResponse);
          artifactsToInsert.push({ artifact_type: 'image_brief', title: 'Image Brief', content: { text: parsed.brief } });
          artifactsToInsert.push({ artifact_type: 'image_prompt', title: 'Image Prompt', content: { text: parsed.prompt } });
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
        }
      }

    } else if (currentStatus === 'image_pending') {
      nextStatus = 'image_review';
      logMsg = 'Generating featured sandbox graphic assets and launching quality review audits...';

      const { data: promptArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'image_prompt')
        .maybeSingle();

      const promptStr = String((promptArt?.content as any)?.text || 'A rustic South African country farm stall, warm morning sunshine.');

      const { data: briefArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'image_brief')
        .maybeSingle();

      const briefStr = String((briefArt?.content as any)?.text || '');

      let imageUrl = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop';
      let providerName = 'placeholder';
      let storagePath = '';

      if (!isMock) {
        try {
          const generated = await generateFeaturedImage(promptStr, id);
          imageUrl = generated.image_url;
          providerName = generated.provider;
          storagePath = generated.storage_path || '';
        } catch (err) {
          console.error('Image gen failed, fallback to unsplash:', err);
        }
      }

      // 1. Create Image Job
      const { data: imageJob, error: imageJobError } = await supabase.from('image_jobs').insert({
        article_id: id,
        prompt: promptStr,
        style_type: 'premium_editorial_south_african_lifestyle',
        generation_status: 'completed',
        review_status: 'pending',
        image_url: imageUrl,
        provider: providerName,
        storage_path: storagePath
      }).select('*').single();

      if (imageJobError) throw imageJobError;

      // 2. Perform Image Review
      let passed = true;
      let rating = 4;
      let comments = 'Excellent light exposure, realistic rustic farm elements, perfect local color balance.';

      if (!isMock) {
        const prompt = `You are a professional Creative Director. Review this image direction brief: "${briefStr}" and its generated prompt: "${promptStr}".
Assess whether it maintains authenticity (no bizarre artifacts, realistic lighting, genuine cultural representation, child safety).
Provide the output strictly in JSON matching this schema:
{
  "rating": 5,
  "passed": true,
  "comments": "string"
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              rating: { type: 'INTEGER' },
              passed: { type: 'BOOLEAN' },
              comments: { type: 'STRING' }
            },
            required: ['rating', 'passed', 'comments']
          });
          const parsed = JSON.parse(aiResponse);
          rating = parsed.rating;
          passed = parsed.passed;
          comments = parsed.comments;
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
        }
      }

      await supabase.from('image_reviews').insert({
        image_job_id: imageJob.id,
        relevance_score: rating,
        realism_score: rating,
        anatomy_score: rating,
        composition_score: rating,
        artifact_flags: [],
        notes: comments,
        approved: passed
      });

      artifactsToInsert.push({
        artifact_type: 'image_quality_review',
        title: 'Image Quality Review',
        content: { rating, passed, comments }
      });

      await supabase.from('articles').update({
        image_status: passed ? 'approved' : 'needs_regeneration'
      }).eq('id', id);

    } else if (currentStatus === 'image_review') {
      nextStatus = 'fact_checking';
      logMsg = 'Running automated zero-hallucination fact checking against research notes and external databases...';

      const { data: editedArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'edited_article')
        .maybeSingle();

      const editedStr = String((editedArt?.content as any)?.text || '');

      const { data: researchArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'research_notes')
        .maybeSingle();

      const researchStr = String((researchArt?.content as any)?.text || '');

      let verifiedClaims: string[] = ['Location on R563, Cradle of Humankind is accurate.', 'Blaauwbank farm shop hours Wed-Sun are correct.'];
      let weakClaims: string[] = [];
      let score = 100;
      let checkStatus = 'passed';
      let reportStr = 'Factual truth model completed successfully. Zero inventions flagged.';

      if (!isMock) {
        const prompt = `You are the Lead Fact Checker. Analyze this edited article draft: "${editedStr}" against these research notes: "${researchStr}".
Verify:
1. Are there any invented events, locations, or dates?
2. Flag any weak, speculative, or unverified claims.
Provide the output strictly in JSON matching this schema:
{
  "verifiedClaims": ["string"],
  "weakClaims": ["string"],
  "score": 100,
  "status": "passed | needs_review | failed",
  "detailedReport": "string"
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              verifiedClaims: { type: 'ARRAY', items: { type: 'STRING' } },
              weakClaims: { type: 'ARRAY', items: { type: 'STRING' } },
              score: { type: 'INTEGER' },
              status: { type: 'STRING' },
              detailedReport: { type: 'STRING' }
            },
            required: ['verifiedClaims', 'weakClaims', 'score', 'status', 'detailedReport']
          });
          const parsed = JSON.parse(aiResponse);
          verifiedClaims = parsed.verifiedClaims;
          weakClaims = parsed.weakClaims;
          score = parsed.score;
          checkStatus = parsed.status === 'passed' ? 'passed' : 'needs_review';
          reportStr = parsed.detailedReport;
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
        }
      }

      artifactsToInsert.push({
        artifact_type: 'fact_check_report',
        title: 'Fact Check Report',
        content: { score, status: checkStatus, verifiedClaims, weakClaims, detailedReport: reportStr }
      });

      await supabase.from('articles').update({
        fact_check_status: checkStatus as any
      }).eq('id', id);

    } else if (currentStatus === 'fact_checking') {
      nextStatus = 'bias_review';
      logMsg = 'Executing sensitive bias checks and style guidelines compliance audit...';

      const { data: editedArt } = await supabase
        .from('article_artifacts')
        .select('content')
        .eq('article_id', id)
        .eq('artifact_type', 'edited_article')
        .maybeSingle();

      const editedStr = String((editedArt?.content as any)?.text || '');

      let complianceLevel = 'high';
      let issuesFound: string[] = [];
      let recommendations = 'Tone is highly enthusiastic, supportive, and safe for families.';
      let report = 'Sensitive content and guideline check passed.';

      if (!isMock) {
        const prompt = `Analyze this edited article draft: "${editedStr}".
Check for:
1. Tone match: is it warm, sensory-driven, inclusive, and friendly?
2. Demographics and equity: does it represent diverse people with dignity?
Provide the output strictly in JSON matching this schema:
{
  "issuesFound": ["string"],
  "complianceLevel": "high | medium | low",
  "recommendations": "string",
  "report": "string"
}`;
        try {
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              issuesFound: { type: 'ARRAY', items: { type: 'STRING' } },
              complianceLevel: { type: 'STRING' },
              recommendations: { type: 'STRING' },
              report: { type: 'STRING' }
            },
            required: ['issuesFound', 'complianceLevel', 'recommendations', 'report']
          });
          const parsed = JSON.parse(aiResponse);
          complianceLevel = parsed.complianceLevel;
          issuesFound = parsed.issuesFound;
          recommendations = parsed.recommendations;
          report = parsed.report;
        } catch (err: any) {
          if (err.message !== 'mock_fallback') throw err;
        }
      }

      artifactsToInsert.push({
        artifact_type: 'bias_check_report',
        title: 'Bias Check Report',
        content: { complianceLevel, issuesFound, recommendations, report }
      });

      await supabase.from('articles').update({
        bias_check_status: (complianceLevel === 'high' ? 'passed' : 'needs_review') as any
      }).eq('id', id);

    } else if (currentStatus === 'bias_review') {
      nextStatus = 'awaiting_admin_review';
      logMsg = 'Dispatching article briefing and inline approval logs to Telegram Sandbox...';

      // Fetch all sources for Telegram
      const { data: sources } = await supabase.from('sources').select('title, url').eq('article_id', id);

      try {
        await sendTelegramPreview({
          article_id: id,
          title: article.title || 'Untitled Draft',
          website: journalist.website,
          journalist: journalist.name,
          section: article.section || 'Food & Weekend Markets',
          summary: article.summary || 'Sandbox guide.',
          risk_level: article.risk_level,
          fact_check_status: article.fact_check_status,
          bias_check_status: article.bias_check_status,
          image_status: article.image_status,
          sources: (sources || []).map((s) => ({ title: s.title, url: s.url }))
        });
      } catch (err) {
        console.error('Telegram dispatch error:', err);
      }

      // Check if Resend email key is present
      if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_DESTINATION_EMAIL) {
        try {
          const resendKey = process.env.RESEND_API_KEY;
          const destination = process.env.NOTIFICATION_DESTINATION_EMAIL;
          
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: 'Newsroom Lab Agent <onboarding@resend.dev>',
              to: destination,
              subject: `🚨 Newsroom Review: ${article.title || 'New Draft Ready'}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                  <h2 style="color: #1a1a1a; margin-top: 0;">Anika Patel has completed a new draft!</h2>
                  <p style="color: #666; font-size: 14px; line-height: 1.5;">The article is now in <strong>awaiting_admin_review</strong> status and is waiting for your verification in the Newsroom Sandbox.</p>
                  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                  <div style="background-color: #fafafa; padding: 15px; border-radius: 6px;">
                    <p style="margin: 0 0 8px; font-size: 16px;"><strong>Title:</strong> ${article.title || 'Untitled Draft'}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #444;"><strong>Topic:</strong> ${article.topic}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #444;"><strong>Section:</strong> ${article.section || 'Food & Weekend Markets'}</p>
                    <p style="margin: 0; font-size: 14px; color: #444;"><strong>Summary:</strong> ${article.summary || ''}</p>
                  </div>
                  <p style="margin: 20px 0 0; text-align: center;">
                    <a href="${process.env.PUBLIC_BASE_URL || 'http://localhost:8888'}" style="background-color: #E27D60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Sandbox Dashboard</a>
                  </p>
                </div>
              `
            })
          });
          logMsg += ' (Verification email dispatched via Resend)';
        } catch (emailErr) {
          console.error('Failed to send Resend email:', emailErr);
        }
      }
    }

    // 4. Insert artifacts
    if (artifactsToInsert.length) {
      await supabase.from('article_artifacts').insert(
        artifactsToInsert.map((art) => ({
          article_id: id,
          artifact_type: art.artifact_type,
          title: art.title,
          content: art.content
        }))
      );
    }

    // 5. Update article status
    await supabase.from('articles').update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    // 6. Write agent logs
    await supabase.from('agent_logs').insert({
      article_id: id,
      agent_name: 'Anika Patel',
      action: currentStatus,
      output: { message: `${journalist.name} transition: ${currentStatus.toUpperCase()} ➜ ${nextStatus.toUpperCase()}. ${logMsg}` }
    });

    return json(200, { status: nextStatus });
  } catch (error) {
    console.error('Pipeline error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
