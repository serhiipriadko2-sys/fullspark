/**
 * Supabase Client Configuration
 *
 * Provides Supabase client for Iskra Space App
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// API credentials should be in environment variables
// Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper to get current user ID (anonymous or authenticated)
export async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user?.id) {
    return session.user.id;
  }

  // For anonymous users, use a device-based ID stored in localStorage
  let deviceId = localStorage.getItem('iskra_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('iskra_device_id', deviceId);
  }
  return deviceId;
}

// Check if Supabase is available
export async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export default supabase;
