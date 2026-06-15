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
  const [busy, setBusy] = useState(false);

  const supabaseReady = hasSupabaseEnv() && supabase;

  async function submit(event) {
    event.preventDefault();
    setMessage('');

    if (!supabaseReady) {
      setMessage('Supabase is not connected. Check Vercel environment variables and redeploy.');
      return;
    }

    if (!email || !password) {
      setMessage('Enter your email and password.');
      return;
    }

    setBusy(true);

    try {
      const result =
        mode === 'signup'
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/planner`,
              },
            })
          : await supabase.auth.signInWithPassword({
              email,
              password,
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === 'signup' && !result.data?.session) {
        setMessage('Account created. Check your email to confirm your account, then log in.');
        return;
      }

      router.push('/planner');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMessage('');

    if (!supabaseReady) {
      setMessage('Supabase is not connected. Check Vercel environment variables and redeploy.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/planner`,
        },
      });

      if (error) {
        setMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card preview-card" onSubmit={submit}>
        <Link className="logo" href="/">
          try<span>Pan</span>
        </Link>

        <div className="eyebrow">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </div>

        <h2>
          {mode === 'signin'
            ? 'Log in to your meal planner.'
            : 'Start saving your meals.'}
        </h2>

        {!supabaseReady && (
          <div className="notice">
            Supabase is not connected. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.
          </div>
        )}

        {message && <div className="notice">{message}</div>}

        <div className="field">
          <label>Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            type="email"
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            type="password"
          />
        </div>

        <button
          className="primary-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
          disabled={busy}
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Sign up'}
        </button>

        <button
          type="button"
          className="soft-btn"
          style={{ width: '100%', marginTop: 10 }}
          onClick={google}
          disabled={busy}
        >
          Continue with Google
        </button>

        <button
          type="button"
          className="nav-link"
          style={{ marginTop: 12 }}
          onClick={() => {
            setMessage('');
            setMode(mode === 'signin' ? 'signup' : 'signin');
          }}
        >
          {mode === 'signin'
            ? 'Need an account? Sign up'
            : 'Already have an account? Log in'}
        </button>
      </form>
    </main>
  );
}
