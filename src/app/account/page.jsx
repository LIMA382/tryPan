'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { loadProfileForUser, saveProfileForUser } from '@/lib/dataStore';
import { REGIONS, regionLabel } from '@/lib/ingredientCatalog';

function AccountContent({ user }) {
  const router = useRouter();
  const [username, setUsername] = useState(user?.user_metadata?.display_name || user?.user_metadata?.username || '');
  const [region, setRegion] = useState(user?.user_metadata?.region === 'nl' ? 'nl' : 'pt');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const profile = await loadProfileForUser(user);
      if (!active) return;
      setUsername((current) => profile.display_name || current || '');
      setRegion(profile.region || 'pt');
    }

    load();
    return () => { active = false; };
  }, [user]);

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
      await saveProfileForUser(user, { display_name: cleanUsername, region });
      setMessage(`Profile updated. Ingredient prices now use ${regionLabel(region)}.`);
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <AppFrame user={user} title="Account" subtitle="Manage your profile, region and sign-in settings." eyebrow="Settings">
      {message && <div className="notice account-notice">{message}</div>}

      <div className="account-grid">
        <form className="panel-soft account-card" onSubmit={saveProfile}>
          <div className="card-header">
            <h3>Profile</h3>
            <span className="badge">Account</span>
          </div>

          <div className="field">
            <label htmlFor="account-email">Email</label>
            <input id="account-email" value={user.email || ''} disabled />
          </div>

          <div className="field">
            <label htmlFor="account-username">Username</label>
            <input id="account-username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" />
          </div>

          <div className="field">
            <label htmlFor="account-region">Ingredient price region</label>
            <select id="account-region" value={region} onChange={(event) => setRegion(event.target.value)}>
              {REGIONS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <p className="field-help">This controls ingredient suggestions and default prices.</p>
          </div>

          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>

        <form className="panel-soft account-card" onSubmit={savePassword}>
          <div className="card-header">
            <h3>Password</h3>
            <span className="badge private">Security</span>
          </div>

          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="newPassword" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </div>

          <div className="field">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" name="confirmNewPassword" type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" />
          </div>

          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>

      <section className="account-footer-actions panel-soft">
        <div>
          <h3>Spending and meal analytics</h3>
          <p>Analytics now live in their own section instead of being buried inside the pantry page.</p>
        </div>
        <Link className="soft-btn" href="/spending">Open spending</Link>
        <button type="button" className="danger-btn" onClick={signOut}>Sign out</button>
      </section>
    </AppFrame>
  );
}

export default function AccountPage() {
  return <AuthGate>{(user) => <AccountContent user={user} />}</AuthGate>;
}
