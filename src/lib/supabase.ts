import { createClient } from '@supabase/supabase-js';

// The Supabase URL and publishable key are public client configuration.
// Environment variables remain the preferred override, while the project
// defaults prevent a production deployment from becoming disconnected merely
// because Vercel variables were omitted.
const supabaseUrl =
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ||
  'https://vriwhtuxagnbfxybjviz.supabase.co';
const supabaseAnonKey =
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_3NRqWSIZd3KnxVKQ0ngRyg_IvqLZ0aO';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
