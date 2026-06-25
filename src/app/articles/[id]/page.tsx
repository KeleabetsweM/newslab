'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowser';
import { callFunction, statusClass } from '@/lib/clientApi';
import type { Article } from '@/lib/types';

type Artifact = { id: string; article_id: string; artifact_type: string; title: string; content: unknown; created_at: string };
type Source = { id: string; title: string; url: string; publisher: string | null; reliability_score: number | null };
type ImageJob = { id: string; image_url: string | null; prompt: string; style_type: string; quality_score: number | null; review_status: string };

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [imageJob, setImageJob] = useState<ImageJob | null>(null);
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: articleData } = await supabase.from('articles').select('*').eq('id', params.id).single();
    const { data: artifactData } = await supabase.from('article_artifacts').select('*').eq('article_id', params.id).order('created_at');
    const { data: sourceData } = await supabase.from('sources').select('*').eq('article_id', params.id).order('created_at');
    const { data: imageData } = await supabase.from('image_jobs').select('*').eq('article_id', params.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setArticle(articleData as Article);
    setArtifacts((artifactData || []) as Artifact[]);
    setSources((sourceData || []) as Source[]);
    setImageJob((imageData || null) as ImageJob | null);
  }

  useEffect(() => { load(); }, [params.id]);

  async function action(name: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage('Working...');
    try {
      await callFunction(name, { article_id: params.id, feedback, ...body });
      setMessage('Done.');
      setFeedback('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!article) return <p>Loading...</p>;

  return (
    <>
      <div className="header">
        <div>
          <div className="kicker">Article Detail</div>
          <h1>{article.title || article.topic}</h1>
          <p>{article.website} · {article.section} · Anika Patel</p>
        </div>
        <span className={statusClass(article.status)}>{article.status}</span>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Featured image</h2>
          {imageJob?.image_url ? <img className="image-preview" src={imageJob.image_url} alt="Generated article visual" /> : <p>No image yet.</p>}
          <p className="small">Image review: <span className={statusClass(imageJob?.review_status)}>{imageJob?.review_status || 'pending'}</span> · Quality: {imageJob?.quality_score ?? 'N/A'}</p>
          <pre>{imageJob?.prompt || 'No prompt saved yet.'}</pre>
        </div>
        <div className="card">
          <h2>Checks</h2>
          <p><b>Risk:</b> <span className={statusClass(article.risk_level === 'high' ? 'failed' : article.risk_level === 'medium' ? 'needs_review' : 'passed')}>{article.risk_level}</span></p>
          <p><b>Fact check:</b> <span className={statusClass(article.fact_check_status)}>{article.fact_check_status}</span></p>
          <p><b>Bias check:</b> <span className={statusClass(article.bias_check_status)}>{article.bias_check_status}</span></p>
          <textarea className="textarea" placeholder="Optional feedback for revision or memory..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <button className="button" disabled={busy} onClick={() => action('approve-article')}>Approve Sandbox</button>
            <button className="button secondary" disabled={busy} onClick={() => action('request-revision')}>Request Revision</button>
            <button className="button secondary" disabled={busy} onClick={() => action('regenerate-image')}>Regenerate Image</button>
            <button className="button danger" disabled={busy} onClick={() => action('reject-article')}>Reject</button>
          </div>
          {message && <p className="small">{message}</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Article body</h2>
        <div className="article-body">{article.body}</div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Sources</h2>
          {sources.length === 0 && <p>No sources stored yet.</p>}
          {sources.map((source) => (
            <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a><br/><span className="small">{source.publisher || 'Unknown'} · Score {source.reliability_score ?? 'N/A'}</span></p>
          ))}
        </div>
        <div className="card">
          <h2>Artifacts</h2>
          {artifacts.map((artifact) => (
            <details key={artifact.id} style={{ marginBottom: 12 }}>
              <summary><b>{artifact.artifact_type}</b> · {artifact.title}</summary>
              <pre>{typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2)}</pre>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
