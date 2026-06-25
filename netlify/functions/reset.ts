import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const supabase = getSupabaseAdmin();

    // 1. Delete articles (cascade will clean up artifacts, sources, image jobs)
    await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete memory
    await supabase.from('journalist_memory').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Delete logs
    await supabase.from('agent_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Ensure Anika Patel seed is inserted
    await supabase.from('journalists').insert({
      id: 'anika-patel',
      name: 'Anika Patel',
      website: 'www.whatsoninmzansi.co.za',
      sections: ['Food & Weekend Markets', 'Family & Kids Days Out'],
      role: 'Lifestyle & Community Editor',
      tone: 'Friendly, inclusive, highly enthusiastic, sensory-driven, helpful, and warm.',
      personality: 'The Social Foodie. Anika focuses on community, food, family, neighborhood markets, pop-up food stalls, outdoor spaces, and stress-free weekend plans across South Africa.',
      rules: [
        'Do not invent events, dates, prices, venues, quotes, or statistics.',
        'Label unverified facts clearly.',
        'Avoid clickbait and exaggerated claims.',
        'Every article is sandbox-only in Phase 0.',
        'Personality shapes tone but never overrides sourcing.'
      ]
    }).select('*').maybeSingle();

    return json(200, { success: true, message: 'Database reset successful.' });
  } catch (error) {
    console.error('Reset error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
