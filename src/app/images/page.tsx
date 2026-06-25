'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { statusClass } from '@/lib/clientApi';

type ImageJob = { id: string; article_id: string; image_url: string | null; prompt: string; style_type: string; quality_score: number | null; review_status: string; created_at: string };

export default function ImagesPage() {
  const [images, setImages] = useState<ImageJob[]>([]);
  useEffect(() => {
    supabase.from('image_jobs').select('*').order('created_at', { ascending: false }).then(({ data }) => setImages((data || []) as ImageJob[]));
  }, []);

  return (
    <>
      <div className="header"><div><div className="kicker">Visual Desk</div><h1>Images</h1><p>Generated image jobs, prompts, and quality status.</p></div></div>
      <div className="grid two">
        {images.map((image) => (
          <div className="card" key={image.id}>
            {image.image_url ? <img className="image-preview" src={image.image_url} alt="Generated visual" /> : <div className="image-preview" />}
            <p><span className={statusClass(image.review_status)}>{image.review_status}</span> · Score {image.quality_score ?? 'N/A'}</p>
            <p className="small">{image.style_type}</p>
            <pre>{image.prompt}</pre>
            <a className="button secondary" href={`/articles/${image.article_id}`}>Open article</a>
          </div>
        ))}
      </div>
    </>
  );
}
