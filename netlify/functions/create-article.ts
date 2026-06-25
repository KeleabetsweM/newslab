import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';
import OpenAI from 'openai';

async function callAI(systemInstruction: string, prompt: string, expectedSchema?: any): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

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

  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    const payload = await res.json() as any;
    return payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  throw new Error('mock_fallback');
}

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
      .eq('status', 'approved');

    const memories = (memoryRows || []).map((m: any) => m.memory_content as string);
    const memoryContext = memories.map((m) => `- ${m}`).join('\n');

    const isSuggested = !topic;
    let chosenTopic = topic || '';
    let storyIdea = '';
    let title = '';

    const systemPrompt = `You are ${journalist.name}, the ${journalist.role} for the website ${journalist.website}. 
Sections you edit: ${journalist.sections.join(', ')}.
Your tone: ${journalist.tone}
Your personality: ${journalist.personality}

Approved style memories:
${memoryContext || '- No approved memories yet.'}
`;

    const isMock = (process.env.AI_PROVIDER || 'mock').toLowerCase() === 'mock';

    if (isMock) {
      const fallbacks = [
        {
          title: 'Sensory Delights at the Shongweni Farmers Market',
          topic: 'Shongweni Farmers Market in Durban',
          storyIdea: "A weekend culinary safari to Durban's favorite outdoor market, exploring farm cheese, local Zulu clay pottery, and pristine child-friendly nature walk trails."
        },
        {
          title: 'Smiles and Sunshine at Kirstenbosch Botanical Gardens',
          topic: 'Kirstenbosch Family Picnics',
          storyIdea: 'An essential guide to packing the ultimate Cape Town picnic hamper, finding the coolest canopy walkways, and enjoying open-air lawns with toddler-friendly slopes.'
        }
      ];
      const selected = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      chosenTopic = isSuggested ? selected.topic : chosenTopic;
      title = isSuggested ? selected.title : `Explore Mzansi: ${chosenTopic}`;
      storyIdea = isSuggested ? selected.storyIdea : `A family-focused weekend guide around ${chosenTopic}.`;
    } else {
      try {
        if (isSuggested) {
          const prompt = 'Please suggest 1 creative, warm, sensory-driven story idea for a weekend outing or food review in South Africa. Respond strictly in JSON matching this schema: { "suggestedTopic": "string", "title": "string", "storyIdea": "string" }';
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              suggestedTopic: { type: 'STRING' },
              title: { type: 'STRING' },
              storyIdea: { type: 'STRING' }
            },
            required: ['suggestedTopic', 'title', 'storyIdea']
          });
          const parsed = JSON.parse(aiResponse);
          chosenTopic = parsed.suggestedTopic;
          title = parsed.title;
          storyIdea = parsed.storyIdea;
        } else {
          const prompt = `Develop a story idea pitch based on the requested topic: "${topic}". Respond strictly in JSON matching this schema: { "title": "string", "storyIdea": "string" }`;
          const aiResponse = await callAI(systemPrompt, prompt, {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              storyIdea: { type: 'STRING' }
            },
            required: ['title', 'storyIdea']
          });
          const parsed = JSON.parse(aiResponse);
          title = parsed.title;
          storyIdea = parsed.storyIdea;
        }
      } catch (err) {
        // Fallback if API fails
        chosenTopic = isSuggested ? 'Kirstenbosch Botanical Gardens' : chosenTopic;
        title = isSuggested ? 'Kirstenbosch Family Picnic' : `Explore Mzansi: ${chosenTopic}`;
        storyIdea = `A family-focused guide covering ${chosenTopic} with practical weekend tips.`;
      }
    }

    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        journalist_id: 'anika-patel',
        website: journalist.website,
        section: journalist.sections[0] || 'Food & Weekend Markets',
        topic: chosenTopic,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status: 'idea',
        risk_level: 'low',
        fact_check_status: 'needs_review',
        bias_check_status: 'needs_review',
        image_status: 'pending'
      })
      .select('*')
      .single();

    if (articleError) throw articleError;

    // Save story idea artifact
    await supabase.from('article_artifacts').insert({
      article_id: article.id,
      artifact_type: 'story_idea',
      title: 'Story Idea',
      content: { text: storyIdea }
    });

    // Write initial log
    await supabase.from('agent_logs').insert({
      article_id: article.id,
      agent_name: 'Anika Patel',
      action: 'suggest_topic',
      output: { message: `Anika Patel brainstormed pitch: "${title}". Status: IDEA.` }
    });

    return json(200, { article_id: article.id, status: 'idea' });
  } catch (error) {
    console.error('Create article error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
