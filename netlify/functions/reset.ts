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

    // 4. Ensure journalists and schedules seeds are inserted
    const journalistsToSeed = [
      {
        id: 'anika-patel',
        name: 'Anika Patel',
        website: 'mzansimashup.co.za',
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
        ],
        is_active: true
      },
      {
        id: 'oliver-mbatha',
        name: 'Oliver Mbatha',
        website: 'mzansimashup.co.za',
        sections: ['Sports & Outdoor Adventure', 'Local Music & Gigs'],
        role: 'Sports & Entertainment Editor',
        tone: 'Energetic, colloquial, punchy, conversational, and highly engaging.',
        personality: 'The Adventure Seeker. Oliver covers soccer matches, local band gigs, hiking trails, cycling races, and live music festivals across South Africa.',
        rules: [
          'Do not exaggerate scorelines or crowd sizes.',
          'Cross-verify ticket prices and venue addresses.',
          'Use active voice and punchy paragraphs.',
          'Physical confirmation required for unlisted venues.'
        ],
        is_active: true
      },
      {
        id: 'zola-ndlovu',
        name: 'Zola Ndlovu',
        website: 'mzansimashup.co.za',
        sections: ['Tech & Startups', 'Business & Finance'],
        role: 'Tech & Innovation Editor',
        tone: 'Analytical, professional, clear, concise, and forward-looking.',
        personality: 'The Tech Hub Reporter. Zola covers startup pitches, venture capital deals, technology hubs, digital transformation, and young entrepreneur stories.',
        rules: [
          'Always define technical jargon on first mention.',
          'Verify company registration and founder names.',
          'No hype, focus on actual metrics and utility.',
          'Check funding amounts against official press releases.'
        ],
        is_active: true
      }
    ];

    for (const j of journalistsToSeed) {
      await supabase.from('journalists').upsert(j);
      await supabase.from('journalist_schedules').upsert({
        journalist_id: j.id,
        enabled: true,
        frequency: 'weekly',
        days_of_week: [1, 3, 5],
        preferred_hour_utc: 7,
        timezone: 'Africa/Johannesburg',
        weekly_quota: 3,
        max_pending_reviews: 2,
        auto_advance: true,
        stop_status: 'awaiting_admin_review'
      }, { onConflict: 'journalist_id' });
    }


    return json(200, { success: true, message: 'Database reset successful.' });
  } catch (error) {
    console.error('Reset error:', error);
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
