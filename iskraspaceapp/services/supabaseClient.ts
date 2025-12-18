/**
 * Supabase Client Configuration
 *
 * Provides Supabase client for Iskra Space App
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://typcvaszcfdpkzbjzuur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cGN2YXN6Y2ZkcGt6Ymp6dXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjIzNzcsImV4cCI6MjA4MTYzODM3N30.YAgFEsJGvS3k58VxnPhELbM-JbdtQP4-2amvabpT3wo';

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
