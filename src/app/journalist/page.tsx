'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';

type Journalist = { id: string; name: string; website: string; sections: string[]; role: string; tone: string; personality: string; rules: string[] };

export default function JournalistPage() {
  const [journalist, setJournalist] = useState<Journalist | null>(null);
  useEffect(() => {
    supabase.from('journalists').select('*').eq('id', 'anika-patel').maybeSingle().then(({ data }) => setJournalist(data as Journalist | null));
  }, []);

  return (
    <>
      <div className="header"><div><div className="kicker">Test Journalist</div><h1>Anika Patel</h1><p>One-week sandbox personality and editorial profile.</p></div></div>
      <div className="grid two">
        <div className="card">
          <h2>{journalist?.name || 'Anika Patel'}</h2>
          <p><b>Website:</b> {journalist?.website || 'www.whatsoninmzansi.co.za'}</p>
          <p><b>Sections:</b> {journalist?.sections?.join(', ') || 'Food & Weekend Markets, Family & Kids Days Out'}</p>
          <p><b>Role:</b> {journalist?.role || 'Lifestyle & Community Editor'}</p>
          <p><b>Tone:</b> {journalist?.tone || 'Friendly, inclusive, enthusiastic, sensory-driven, helpful, and warm.'}</p>
        </div>
        <div className="card">
          <h2>Personality</h2>
          <p>{journalist?.personality || 'The Social Foodie. She focuses on community, food, family, markets, outdoor activities, and easy weekend plans.'}</p>
          <div className="hr" />
          <p className="small">Personality influences style, not facts. Sources and human approval always override persona.</p>
        </div>
      </div>
    </>
  );
}
