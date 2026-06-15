'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

export default function AuthGate({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || !supabase) {
      setStatus('missing-env');
      setUser(null);
      return;
    }

    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data?.session?.user) {
        setUser(null);
        setStatus('unauthenticated');
        router.replace('/login');
        return;
      }

      setUser(data.session.user);
      setStatus('authenticated');
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setStatus('unauthenticated');
        router.replace('/login');
        return;
      }

      setUser(session.user);
      setStatus('authenticated');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="page-shell">
        <div className="card">Loading tryPan…</div>
      </div>
    );
  }

  if (status === 'missing-env') {
    return (
      <div className="page-shell">
        <div className="card">
          <h2>Supabase is not connected.</h2>
          <p>Add Supabase environment variables in Vercel, then redeploy.</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || !user) return null;

  return children(user);
}
