import { createClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const SUPABASE_URL = 
  env.VITE_SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://lelmcuezksfeblhfrcmy.supabase.co';

const SUPABASE_ANON_KEY = 
  env.VITE_SUPABASE_ANON_KEY || 
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_b7fhiEUZlkKjesrPt4qTPA_YdFDUxAo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
