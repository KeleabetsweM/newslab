'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { callFunction, statusClass } from '@/lib/clientApi';

type Memory = { id: string; memory_type: string; memory_content: string; confidence_score: number; status: string; created_at: string };

export default function MemoryPage() {
  const [items, setItems] = useState<Memory[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const { data } = await supabase.from('journalist_memory').select('*').order('created_at', { ascending: false });
    setItems((data || []) as Memory[]);
  }
  useEffect(() => { load(); }, []);

  async function updateMemory(memory_id: string, action: 'approve' | 'reject') {
    try {
      await callFunction('update-memory', { memory_id, action });
      setMessage(`Memory ${action}d.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update memory.');
    }
  }

  return (
    <>
      <div className="header"><div><div className="kicker">Learning Layer</div><h1>Memory</h1><p>Structured lessons from admin feedback. Memory can shape style, but never acts as factual proof.</p></div></div>
      {message && <p className="small">{message}</p>}
      <div className="card">
        <table className="table">
          <thead><tr><th>Type</th><th>Memory</th><th>Confidence</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.memory_type}</td>
                <td>{item.memory_content}</td>
                <td>{item.confidence_score}</td>
                <td><span className={statusClass(item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : 'needs_review')}>{item.status}</span></td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {item.status === 'candidate' && <button className="button secondary" onClick={() => updateMemory(item.id, 'approve')}>Approve</button>}
                  {item.status === 'candidate' && <button className="button danger" onClick={() => updateMemory(item.id, 'reject')}>Reject</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
