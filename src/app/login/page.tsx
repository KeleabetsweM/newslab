'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loginWithPassword() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    window.location.href = '/';
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    setLoading(false);
    setMessage(error ? error.message : 'Magic link sent. Check your email.');
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="kicker">Private Access</div>
        <h1>Login</h1>
        <p>Use a Supabase Auth user whose email is included in ADMIN_EMAILS.</p>
        <div className="form-grid">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Password optional for magic link" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="button" disabled={loading || !email || !password} onClick={loginWithPassword}>Login with password</button>
          <button className="button secondary" disabled={loading || !email} onClick={sendMagicLink}>Send magic link</button>
          {message && <p className="small">{message}</p>}
        </div>
      </div>
    </div>
  );
}
