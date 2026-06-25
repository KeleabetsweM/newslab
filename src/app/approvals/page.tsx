'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { statusClass } from '@/lib/clientApi';

type Approval = { id: string; article_id: string; approval_status: string; telegram_message_id: string | null; admin_feedback: string | null; created_at: string };

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  useEffect(() => {
    supabase.from('telegram_approvals').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems((data || []) as Approval[]));
  }, []);
  return (
    <>
      <div className="header"><div><div className="kicker">Control Center</div><h1>Approvals</h1><p>Telegram and dashboard approval history.</p></div></div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Article</th><th>Status</th><th>Telegram Message</th><th>Feedback</th><th>Date</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><a href={`/articles/${item.article_id}`}>{item.article_id}</a></td>
                <td><span className={statusClass(item.approval_status)}>{item.approval_status}</span></td>
                <td className="small">{item.telegram_message_id || 'N/A'}</td>
                <td className="small">{item.admin_feedback || ''}</td>
                <td className="small">{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
