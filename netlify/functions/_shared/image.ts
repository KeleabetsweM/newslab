import OpenAI from 'openai';
import { getSupabaseAdmin } from './supabase';

export async function generateFeaturedImage(prompt: string, articleId: string) {
  const provider = (process.env.IMAGE_PROVIDER || 'placeholder').toLowerCase();
  let buffer: Buffer;
  let contentType = 'image/svg+xml';
  let fileExt = 'svg';

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt,
      size: '1024x1024'
    } as any);
    const b64 = (result.data?.[0] as any)?.b64_json;
    if (!b64) throw new Error('OpenAI image response did not include b64_json.');
    buffer = Buffer.from(b64, 'base64');
    contentType = 'image/png';
    fileExt = 'png';
  } else {
    const svg = createEditorialPlaceholderSvg(prompt);
    buffer = Buffer.from(svg, 'utf8');
  }

  const bucket = process.env.SUPABASE_IMAGE_BUCKET || 'newsroom-images';
  const path = `${articleId}/${Date.now()}.${fileExt}`;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { image_url: data.publicUrl, provider, storage_path: path };
  } catch {
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    return { image_url: dataUrl, provider: `${provider}_data_url_fallback`, storage_path: null };
  }
}

export function createEditorialPlaceholderSvg(prompt: string) {
  const safePrompt = escapeXml(prompt).slice(0, 260);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#1c2541"/>
      <stop offset="0.48" stop-color="#111827"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
    <radialGradient id="sun" cx="72%" cy="22%" r="48%">
      <stop offset="0" stop-color="#fbbf24" stop-opacity="0.85"/>
      <stop offset="0.42" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000" flood-opacity="0.32"/>
    </filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#sun)"/>
  <g opacity="0.2">
    <circle cx="180" cy="180" r="120" fill="#38bdf8"/>
    <circle cx="1340" cy="780" r="190" fill="#f59e0b"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="160" y="160" width="1280" height="680" rx="58" fill="#f8fafc" opacity="0.08" stroke="#ffffff" stroke-opacity="0.18"/>
    <path d="M250 660 C420 520, 560 560, 720 430 C840 330, 990 420, 1120 330 C1240 250, 1330 330, 1390 260 L1390 840 L250 840 Z" fill="#ffffff" opacity="0.08"/>
    <circle cx="420" cy="450" r="78" fill="#f59e0b" opacity="0.72"/>
    <circle cx="610" cy="530" r="50" fill="#38bdf8" opacity="0.68"/>
    <circle cx="1150" cy="470" r="94" fill="#f8fafc" opacity="0.18"/>
    <rect x="250" y="710" width="1100" height="40" rx="20" fill="#ffffff" opacity="0.13"/>
  </g>
  <text x="160" y="90" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#fbbf24" letter-spacing="4">NEWSROOM LAB · IMAGE PLACEHOLDER</text>
  <foreignObject x="220" y="790" width="1160" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, Arial, sans-serif; color: #f8fafc; font-size: 30px; line-height: 1.35; font-weight: 700; text-shadow: 0 4px 24px rgba(0,0,0,.45);">
      ${safePrompt}
    </div>
  </foreignObject>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));
}
