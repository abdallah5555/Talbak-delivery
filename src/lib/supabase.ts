import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
if (!url || !key) throw new Error("Talbak Supabase configuration is missing");
export const supabase = createClient(url, key, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
