'use client';

import { useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { supabase } from '@/lib/supabaseClient';

function AccountContent({ user }) {
  const [username, setUsername] = useState(user?.user_metadata?.display_name || user?.user_metadata?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setMessage('');
    const cleanUsername = username.trim();

    if (cleanUsername.length < 2) {
      setMessage('Username must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: cleanUsername, username: cleanUsername } });
      if (error) throw error;
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, display_name: cleanUsername });
      setMessage('Profile updated.');
    } catch (err) {
      setMessage(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      setMessage('Password updated.');
    } catch (err) {
      setMessage(err.message || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppFrame user={user} title="Account hub" subtitle="Manage your username and sign-in settings." eyebrow="Settings">
      {message && <div className="notice account-notice">{message}</div>}
      <div className="account-grid">
        <form className="panel-soft account-card" onSubmit={saveProfile}>
          <div className="card-header"><h3>Profile</h3><span className="badge">Account</span></div>
          <div className="field"><label>Email</label><input value={user.email || ''} disabled /></div>
          <div className="field"><label>Username</label><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" /></div>
          <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>

        <form className="panel-soft account-card" onSubmit={savePassword}>
          <div className="card-header"><h3>Password</h3><span className="badge private">Security</span></div>
          <div className="field"><label>New password</label><input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></div>
          <div className="field"><label>Confirm new password</label><input type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" /></div>
          <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>
    </AppFrame>
  );
}

export default function AccountPage() {
  return <AuthGate>{(user) => <AccountContent user={user} />}</AuthGate>;
}
