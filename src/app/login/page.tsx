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
    setMessage(error ? error.message : 'Magic link sent. Check your email inbox.');
  }

  return (
    <div className="min-h-screen w-screen bg-[#FDFDFB] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
      {/* Background organic gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#E27D60]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-[#E5E2D9] rounded-2xl shadow-xl shadow-slate-100/50 p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold font-mono tracking-widest text-[#E27D60] uppercase bg-[#E27D60]/5 px-2.5 py-1 rounded border border-[#E27D60]/10">
            Private Phase 0 Access
          </span>
          <h1 className="text-3xl font-serif italic text-[#2D2926] font-bold tracking-tight pt-2">
            Newsroom Lab
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Authorize your administrative sandbox session using your Supabase credentials.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Email Address
            </label>
            <input 
              type="email"
              className="w-full text-sm bg-[#F8F7F3] border border-[#E5E2D9] rounded-xl px-4 py-3 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all"
              placeholder="admin@whatsoninmzansi.co.za" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <input 
              type="password"
              className="w-full text-sm bg-[#F8F7F3] border border-[#E5E2D9] rounded-xl px-4 py-3 text-[#2D2926] placeholder-slate-400 focus:outline-none focus:border-[#E27D60] focus:bg-white transition-all"
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <div className="pt-2 space-y-2">
            <button 
              className="w-full py-3 bg-[#E27D60] hover:bg-[#e27d60]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#E27D60]/10 hover:shadow-[#E27D60]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none" 
              disabled={loading || !email || !password} 
              onClick={loginWithPassword}
            >
              {loading ? 'Authenticating...' : 'Sign In with Password'}
            </button>
            
            <button 
              className="w-full py-3 bg-white border border-[#E5E2D9] hover:bg-[#F8F7F3] text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={loading || !email} 
              onClick={sendMagicLink}
            >
              Send Magic Link Email
            </button>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-[#F8F7F3] border border-[#E5E2D9] rounded-xl text-center">
            <p className="text-[11px] font-serif italic text-slate-600">{message}</p>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-[9px] text-slate-400 font-mono">
            Note: Admin privileges are checked against ADMIN_EMAILS in system secrets.
          </p>
        </div>
      </div>
    </div>
  );
}
