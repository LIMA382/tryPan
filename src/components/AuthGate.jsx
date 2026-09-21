'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

let cachedUser;
let sessionRequest;

export default function AuthGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(cachedUser !== undefined);
  const [user, setUser] = useState(cachedUser || null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setReady(true);
      setUser({ id: 'demo-user', email: 'demo@trypan.app' });
      return;
    }

    // getSession reads the locally cached session. getUser performs a network
    // request on every protected-page navigation and made the app feel sluggish.
    sessionRequest ||= supabase.auth.getSession();
    sessionRequest.then(({ data }) => {
      const sessionUser = data?.session?.user || null;
      cachedUser = sessionUser;
      if (!sessionUser) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?notice=auth-required&returnTo=${encodeURIComponent(returnTo)}`);
      }
      setUser(sessionUser);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user || null;
      setUser(cachedUser);
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  if (!ready) return <div className="page-shell"><div className="card">Loading tryPan…</div></div>;
  if (!user) return null;
  return children(user);
}
