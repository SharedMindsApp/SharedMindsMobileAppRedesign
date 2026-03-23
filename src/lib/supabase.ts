import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '[supabase] Missing required environment variables. Please check your .env file.';
  console.error(errorMsg);
  
  if (import.meta.env.DEV) {
    console.error(
      'Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
}

// Create a fully configured Supabase client with connection resilience
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,        // Keep user logged in after refresh
      autoRefreshToken: true,      // Refresh JWT automatically
      detectSessionInUrl: true,    // Needed for OAuth callback redirect
      storage: localStorage,       // Use browser localStorage for session
      storageKey: 'sharedminds.core.auth.token', // Explicit storage key
      flowType: 'pkce',           // Use PKCE flow for better security
    },
    global: {
      headers: {
        'X-Client-Info': 'shared-minds-v1-web',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  }
);
