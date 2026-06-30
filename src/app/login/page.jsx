'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';
import BrandLogo from '@/components/BrandLogo';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const supabaseReady = hasSupabaseEnv() && supabase;
  const isSignup = mode === 'signup';

  async function submit(event) {
    event.preventDefault();
    setMessage('');

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (!supabaseReady) {
      setMessage('Supabase is not connected. Check Vercel environment variables and redeploy.');
      return;
    }
    if (isSignup && cleanUsername.length < 2) {
      setMessage('Choose a username with at least 2 characters.');
      return;
    }
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const result = isSignup
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/planner`,
              data: { display_name: cleanUsername, username: cleanUsername },
            },
          })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }
      if (isSignup && !result.data?.session) {
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
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/planner` } });
      if (error) setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap page-transition">
      <form className="login-card preview-card" onSubmit={submit}>
        <BrandLogo href="/" />
        <div className="eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</div>
        <h2>{isSignup ? 'Start saving your meals.' : 'Log in to your meal planner.'}</h2>

        {message && <div className="notice">{message}</div>}

        {isSignup && (
          <div className="field"><label htmlFor="username">Username</label><input id="username" name="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="maria cooks" autoComplete="nickname" /></div>
        )}

        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" type="email" /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} type="password" /></div>

        {isSignup && (
          <div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" autoComplete="new-password" type="password" /></div>
        )}

        <button className="primary-btn full-width-btn" disabled={busy || !supabaseReady}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}</button>
        <button type="button" className="soft-btn full-width-btn login-secondary-btn" onClick={google} disabled={busy || !supabaseReady} aria-label="Continue with Google">Continue with Google</button>
        <button type="button" className="nav-link login-switch-btn" onClick={() => { setMessage(''); setMode(isSignup ? 'signin' : 'signup'); }}>{isSignup ? 'Already have an account? Log in' : 'Need an account? Sign up'}</button>
      </form>
    </main>
  );
}
