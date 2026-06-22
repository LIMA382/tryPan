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

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      setUser(data.user || null);
      setReady(true);
    });
  }, [router]);

  if (!ready) return <div className="page-shell"><div className="card">Loading tryPan…</div></div>;
  if (!user) return null;
  return children(user);
}
