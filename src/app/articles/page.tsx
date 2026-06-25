'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { statusClass } from '@/lib/clientApi';
import type { Article } from '@/lib/types';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState('all');

  async function load() {
    let query = supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setArticles((data || []) as Article[]);
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <>
      <div className="header">
        <div><div className="kicker">Editorial Queue</div><h1>Articles</h1><p>Drafts, reviews, approvals, rejections, and sandbox-approved work.</p></div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <label className="small">Filter</label>
          <select className="select" style={{ maxWidth: 260 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="awaiting_admin_review">Awaiting admin review</option>
            <option value="approved_sandbox">Approved sandbox</option>
            <option value="revision_requested">Revision requested</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <table className="table">
          <thead><tr><th>Article</th><th>Status</th><th>Checks</th><th>Image</th><th>Created</th></tr></thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td><a href={`/articles/${article.id}`}>{article.title || article.topic}</a><div className="small">{article.website} · {article.section}</div></td>
                <td><span className={statusClass(article.status)}>{article.status}</span></td>
                <td><span className={statusClass(article.fact_check_status)}>{article.fact_check_status}</span> <span className={statusClass(article.bias_check_status)}>{article.bias_check_status}</span></td>
                <td><span className={statusClass(article.image_status)}>{article.image_status}</span></td>
                <td className="small">{new Date(article.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
