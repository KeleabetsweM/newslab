import { supabase } from './supabaseBrowser';

export async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || `Function ${name} failed`);
  }
  return payload as T;
}

export function statusClass(status?: string) {
  if (!status) return 'status';
  if (['approved_sandbox', 'approved', 'passed'].includes(status)) return 'status ok';
  if (['needs_review', 'revision_requested', 'image_review', 'awaiting_admin_review'].includes(status)) return 'status warn';
  if (['rejected', 'failed', 'needs_regeneration'].includes(status)) return 'status bad';
  return 'status';
}
