import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

let cachedClient: SupabaseClient | null = null;
let cachedToken: string | null = null;

export async function getSupabaseClient() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || null;

  // If token hasn't changed, return cached client (prevent multiple GoTrueClient instances)
  if (cachedClient && cachedToken === token) {
    return cachedClient;
  }

  // Token changed or first call - create new client
  cachedToken = token;
  cachedClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    }
  );

  return cachedClient;
}
