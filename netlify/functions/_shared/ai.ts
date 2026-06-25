import OpenAI from 'openai';

export type ArticlePackage = {
  storyIdea: string;
  researchNotes: string;
  sources: Array<{ title: string; url: string; publisher?: string; reliability_score?: number; notes?: string }>;
  outline: string[];
  draftArticle: string;
  editedArticle: string;
  summary: string;
  title: string;
  section: string;
  riskLevel: 'low' | 'medium' | 'high';
  factCheck: { status: 'passed' | 'needs_review' | 'failed'; notes: string; claims: Array<{ claim: string; status: string; source_url?: string; note?: string }> };
  biasCheck: { status: 'passed' | 'needs_review' | 'failed'; notes: string; flags: string[] };
  imageBrief: string;
  imagePrompt: string;
  imageReview: { status: 'approved' | 'needs_regeneration'; quality_score: number; notes: string; flags: string[] };
};

function systemPrompt(memories: string[]) {
  return `You are Anika Patel, an AI-assisted Lifestyle & Community Editor for www.whatsoninmzansi.co.za.
Sections: Food & Weekend Markets, Family & Kids Days Out.
Tone: friendly, inclusive, enthusiastic, sensory-driven, helpful, warm.
Personality: The Social Foodie. You focus on community, food, family, markets, outdoor activities, and easy weekend plans.

Non-negotiable editorial rules:
- Do not invent current events, venues, ticket prices, dates, quotes, statistics, or source links.
- If a fact needs verification, label it clearly as requiring verification.
- Write for a private sandbox, not public publishing.
- Avoid propaganda, manipulative phrasing, and clickbait.
- Create a premium editorial image prompt that avoids AI slop, fake text, warped hands, plastic faces, visual clutter, and generic stock-photo blandness.
- Memory can shape style and preferences only. Memory is never factual proof.

Approved memories:
${memories.length ? memories.map((m) => `- ${m}`).join('\n') : '- No approved memories yet.'}

Return strict JSON only. No markdown fences.`;
}

function userPrompt(topic?: string) {
  return `Create one sandbox article package for Anika Patel.
${topic ? `Topic from admin: ${topic}` : 'No topic was provided. Suggest a safe, useful weekend/community/food/family topic for South African readers.'}

Return JSON with this exact shape:
{
  "storyIdea": "string",
  "researchNotes": "string",
  "sources": [{ "title": "string", "url": "string", "publisher": "string", "reliability_score": 1, "notes": "string" }],
  "outline": ["string"],
  "draftArticle": "string",
  "editedArticle": "string",
  "summary": "string",
  "title": "string",
  "section": "Food & Weekend Markets OR Family & Kids Days Out",
  "riskLevel": "low | medium | high",
  "factCheck": { "status": "passed | needs_review | failed", "notes": "string", "claims": [{ "claim": "string", "status": "supported | needs_verification | unsupported", "source_url": "string", "note": "string" }] },
  "biasCheck": { "status": "passed | needs_review | failed", "notes": "string", "flags": ["string"] },
  "imageBrief": "string",
  "imagePrompt": "string",
  "imageReview": { "status": "approved | needs_regeneration", "quality_score": 1, "notes": "string", "flags": ["string"] }
}

If you cannot verify a source, use the url value "NEEDS_MANUAL_SOURCE" and set factCheck.status to "needs_review".`;
}

export async function generateArticlePackage(topic: string | undefined, memories: string[]): Promise<ArticlePackage> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const prompt = userPrompt(topic);
  const sys = systemPrompt(memories);

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await (client.responses as any).create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt }
      ],
      text: { format: { type: 'json_object' } }
    });
    return normalizePackage(JSON.parse(response.output_text));
  }

  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${sys}\n\n${prompt}` }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    const payload = await res.json() as any;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return normalizePackage(JSON.parse(text));
  }

  return mockPackage(topic);
}

export async function generateMemoryCandidates(feedback: string, articleTitle: string) {
  const trimmed = feedback.trim();
  if (!trimmed) return [];
  return [
    {
      memory_type: trimmed.toLowerCase().includes('image') ? 'image_preference' : 'editorial_preference',
      memory_content: `From feedback on "${articleTitle}": ${trimmed}`,
      confidence_score: 0.7
    }
  ];
}

function normalizePackage(raw: any): ArticlePackage {
  const fallback = mockPackage('Community weekend guide');
  return {
    storyIdea: String(raw.storyIdea || fallback.storyIdea),
    researchNotes: String(raw.researchNotes || fallback.researchNotes),
    sources: Array.isArray(raw.sources) ? raw.sources.map((s: any) => ({
      title: String(s.title || 'Needs manual source'),
      url: String(s.url || 'NEEDS_MANUAL_SOURCE'),
      publisher: s.publisher ? String(s.publisher) : undefined,
      reliability_score: Number(s.reliability_score || 1),
      notes: s.notes ? String(s.notes) : undefined
    })) : fallback.sources,
    outline: Array.isArray(raw.outline) ? raw.outline.map(String) : fallback.outline,
    draftArticle: String(raw.draftArticle || fallback.draftArticle),
    editedArticle: String(raw.editedArticle || raw.draftArticle || fallback.editedArticle),
    summary: String(raw.summary || fallback.summary),
    title: String(raw.title || fallback.title),
    section: raw.section === 'Family & Kids Days Out' ? 'Family & Kids Days Out' : 'Food & Weekend Markets',
    riskLevel: ['low', 'medium', 'high'].includes(raw.riskLevel) ? raw.riskLevel : 'medium',
    factCheck: {
      status: ['passed', 'needs_review', 'failed'].includes(raw.factCheck?.status) ? raw.factCheck.status : 'needs_review',
      notes: String(raw.factCheck?.notes || 'Requires manual source review.'),
      claims: Array.isArray(raw.factCheck?.claims) ? raw.factCheck.claims.map((c: any) => ({ claim: String(c.claim || ''), status: String(c.status || 'needs_verification'), source_url: c.source_url ? String(c.source_url) : undefined, note: c.note ? String(c.note) : undefined })) : []
    },
    biasCheck: {
      status: ['passed', 'needs_review', 'failed'].includes(raw.biasCheck?.status) ? raw.biasCheck.status : 'needs_review',
      notes: String(raw.biasCheck?.notes || 'No major bias flags detected, but human review required.'),
      flags: Array.isArray(raw.biasCheck?.flags) ? raw.biasCheck.flags.map(String) : []
    },
    imageBrief: String(raw.imageBrief || fallback.imageBrief),
    imagePrompt: String(raw.imagePrompt || fallback.imagePrompt),
    imageReview: {
      status: raw.imageReview?.status === 'approved' ? 'approved' : 'needs_regeneration',
      quality_score: Math.max(1, Math.min(10, Number(raw.imageReview?.quality_score || 7))),
      notes: String(raw.imageReview?.notes || 'Initial prompt review only. Visual must be reviewed after generation.'),
      flags: Array.isArray(raw.imageReview?.flags) ? raw.imageReview.flags.map(String) : []
    }
  };
}

function mockPackage(topic?: string): ArticlePackage {
  const baseTopic = topic || 'A family-friendly weekend market guide for Johannesburg readers';
  return {
    storyIdea: `A practical, warm weekend guide around: ${baseTopic}`,
    researchNotes: 'Mock mode is active. Replace NEEDS_MANUAL_SOURCE links with verified sources before public publishing.',
    sources: [
      { title: 'Manual source required', url: 'NEEDS_MANUAL_SOURCE', publisher: 'Admin', reliability_score: 1, notes: 'Mock provider did not browse the web.' }
    ],
    outline: ['Why this weekend plan works', 'Who it suits', 'What to check before going', 'How to make it stress-free'],
    draftArticle: `A warm draft about ${baseTopic}. This is mock content for testing the approval workflow.`,
    editedArticle: `# ${baseTopic}\n\nSouth African weekends are often at their best when the plan is simple: good food, relaxed movement, and enough space for families or friends to settle in without pressure.\n\nFor this sandbox test, Anika would turn the topic into a useful guide with practical checks: opening times, venue rules, parking, child-friendly facilities, food options, and whether visitors should book ahead.\n\nBefore publishing publicly, every venue, date, price, and event detail must be verified with current sources.\n\n## What to check before you go\n\n- Confirm operating hours from the official venue page.\n- Check whether booking is required.\n- Confirm parking, card payment, and family facilities.\n- Avoid relying on old social posts for current details.`,
    summary: 'A sandbox-ready article package for testing Anika’s food, markets, and family day-out workflow.',
    title: baseTopic,
    section: 'Food & Weekend Markets',
    riskLevel: 'low',
    factCheck: {
      status: 'needs_review',
      notes: 'Mock mode uses placeholder sources. Manual source verification is required.',
      claims: [{ claim: 'Specific venue details must be verified before publishing.', status: 'needs_verification', source_url: 'NEEDS_MANUAL_SOURCE' }]
    },
    biasCheck: { status: 'passed', notes: 'No manipulative or propaganda-style language detected in mock content.', flags: [] },
    imageBrief: 'Create a premium editorial-style image of a sunny South African weekend market with diverse families, warm food stalls, natural light, clean composition, and authentic community energy.',
    imagePrompt: 'Professional editorial photography style, South African weekend food market, diverse families walking between food stalls, warm natural daylight, tasteful composition, realistic textures, no readable text, no distorted hands, no plastic faces, no overdone AI effects, premium magazine quality.',
    imageReview: { status: 'approved', quality_score: 8, notes: 'Prompt is aligned with the article and avoids common AI slop cues.', flags: [] }
  };
}
