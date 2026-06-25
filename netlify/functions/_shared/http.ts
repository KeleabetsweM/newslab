import type { HandlerEvent } from '@netlify/functions';

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

export function parseJson<T = Record<string, unknown>>(event: HandlerEvent): T {
  if (!event.body) return {} as T;
  try { return JSON.parse(event.body) as T; } catch { return {} as T; }
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90) || 'untitled-article';
}

export function clamp(input: string, max = 3000) {
  return (input || '').slice(0, max);
}
