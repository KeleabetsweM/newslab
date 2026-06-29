import type { HandlerEvent } from '@netlify/functions';
import { getSupabaseAnon } from './supabase';

export async function requireAdmin(event: HandlerEvent) {
  if (process.env.NETLIFY_DEV === 'true') {
    return { email: 'keleabetswe.maseko@gmail.com' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Not authenticated. Please log in.');

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) throw new Error('Invalid session.');

  const allowList = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (allowList.length && !allowList.includes(data.user.email.toLowerCase())) {
    throw new Error('This user is not in ADMIN_EMAILS.');
  }
  return data.user;
}
