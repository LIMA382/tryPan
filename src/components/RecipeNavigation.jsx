'use client';

import { useEffect, useState } from 'react';
import AppNav from './AppNav';
import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

export default function RecipeNavigation() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!hasSupabaseEnv()) { setUser({ id: 'demo-user', email: 'demo@trypan.app' }); return; }
    supabase?.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
  }, []);
  return <AppNav user={user} />;
}

