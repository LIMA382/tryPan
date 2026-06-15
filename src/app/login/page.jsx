'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');

    if (!hasSupabaseEnv()) {
      router.push('/planner');
      return;
    }

    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) setMessage(result.error.message);
    else router.push('/planner');
  }

  async function google() {
    if (!hasSupabaseEnv()) return router.push('/planner');
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/planner` } });
  }

  return (
    <main className="login-wrap">
      <form className="login-card preview-card" onSubmit={submit}>
        <Link className="logo" href="/">try<span>Pan</span></Link>
        <div className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Create account'}</div>
        <h2>{mode === 'signin' ? 'Log in to your meal planner.' : 'Start saving your meals.'}</h2>
        {!hasSupabaseEnv() && <div className="notice">Demo mode: add Supabase env vars to enable real accounts.</div>}
        {message && <div className="notice">{message}</div>}
        <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
        <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>{mode === 'signin' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="soft-btn" style={{ width: '100%', marginTop: 10 }} onClick={google}>Continue with Google</button>
        <button type="button" className="nav-link" style={{ marginTop: 12 }} onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </form>
    </main>
  );
}
