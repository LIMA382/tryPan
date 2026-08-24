'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

export default function AuthGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setReady(true);
      setUser({ id: 'demo-user', email: 'demo@trypan.app' });
      return;
    }

    // getSession reads the locally cached session. getUser performs a network
    // request on every protected-page navigation and made the app feel sluggish.
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data?.session?.user || null;
      if (!sessionUser) router.replace('/login');
      setUser(sessionUser);
      setReady(true);
    });
  }, [router]);

  if (!ready) return <div className="page-shell"><div className="card">Loading tryPan…</div></div>;
  if (!user) return null;
  return children(user);
}
