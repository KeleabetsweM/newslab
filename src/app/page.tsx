'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { callFunction, statusClass } from '@/lib/clientApi';
import type { Article } from '@/lib/types';

type Stats = { total: number; pending: number; approved: number; rejected: number; memoryCandidates: number };

export default function DashboardPage() {
  const [topic, setTopic] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, memoryCandidates: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData() {
    const { data: articleData } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const { count: memoryCandidates } = await supabase
      .from('journalist_memory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'candidate');

    const all = (articleData || []) as Article[];
    setArticles(all);
    const { count: total } = await supabase.from('articles').select('*', { count: 'exact', head: true });
    const { count: pending } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_admin_review');
    const { count: approved } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'approved_sandbox');
    const { count: rejected } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
    setStats({ total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0, memoryCandidates: memoryCandidates || 0 });
  }

  useEffect(() => { loadData(); }, []);

  async function createArticle() {
    setLoading(true);
    setMessage('Creating newsroom package...');
    try {
      const result = await callFunction<{ article_id: string }>('create-article', { topic: topic.trim() || undefined });
      setMessage(`Article package created: ${result.article_id}`);
      setTopic('');
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="header">
        <div>
          <div className="kicker">Phase 0 Sandbox</div>
          <h1>Newsroom Lab</h1>
          <p>Monitor Anika Patel for one week before connecting any WordPress website.</p>
        </div>
        <button className="button secondary" onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}>Sign out</button>
      </div>

      <div className="grid three">
        <div className="card compact"><div className="stat">{stats.total}</div><div className="label">Total articles</div></div>
        <div className="card compact"><div className="stat">{stats.pending}</div><div className="label">Awaiting review</div></div>
        <div className="card compact"><div className="stat">{stats.memoryCandidates}</div><div className="label">Memory candidates</div></div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Create test article</h2>
          <p>Give Anika a topic, or leave it blank and let her suggest one for food, markets, or family days out.</p>
          <div className="form-grid">
            <textarea className="textarea" placeholder="Example: Affordable family-friendly weekend markets in Johannesburg" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <button className="button" disabled={loading} onClick={createArticle}>{loading ? 'Creating...' : 'Create Article Package'}</button>
            {message && <p className="small">{message}</p>}
          </div>
        </div>
        <div className="card">
          <h2>Week-one goal</h2>
          <p>Approve only what feels credible, human, useful, and visually clean. Every approval/rejection becomes structured learning for the journalist.</p>
          <div className="hr" />
          <p className="small">Phase 0 publishing is disabled. Approvals only move articles into <b>approved_sandbox</b>.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Latest articles</h2>
        <table className="table">
          <thead><tr><th>Title</th><th>Status</th><th>Risk</th><th>Created</th></tr></thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td><a href={`/articles/${article.id}`}>{article.title || article.topic}</a><div className="small">{article.section}</div></td>
                <td><span className={statusClass(article.status)}>{article.status}</span></td>
                <td><span className={statusClass(article.risk_level === 'high' ? 'failed' : article.risk_level === 'medium' ? 'needs_review' : 'passed')}>{article.risk_level}</span></td>
                <td className="small">{new Date(article.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
