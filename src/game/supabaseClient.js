// src/game/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Build the shared Supabase client from Vite env vars.
 * Returns null when either env var is missing/blank so the app falls back
 * to the in-memory mock (single-device / demo mode).
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
