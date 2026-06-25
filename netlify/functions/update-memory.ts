import type { Handler } from '@netlify/functions';
import { requireAdmin } from './_shared/auth';
import { json, parseJson } from './_shared/http';
import { getSupabaseAdmin } from './_shared/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    await requireAdmin(event);
    const { memory_id, action } = parseJson<{ memory_id: string; action: 'approve' | 'reject' }>(event);
    if (!memory_id || !['approve', 'reject'].includes(action)) throw new Error('memory_id and valid action are required');
    const status = action === 'approve' ? 'approved' : 'rejected';
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('journalist_memory').update({ status, last_used_at: new Date().toISOString() }).eq('id', memory_id);
    if (error) throw error;
    return json(200, { status });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
