/**
 * SAHAAYA — Supabase Client Configuration
 * 
 * Securely initializes the Supabase client using Vite environment variables.
 * Keys are never exposed in UI or console logs.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Non-destructive connection test.
 * Pings the Supabase REST/Auth API to verify credentials and project reachability.
 * Does NOT log or expose the publishable key.
 */
export async function verifySupabaseConnection() {
  if (!supabase) {
    return {
      success: false,
      message: "Supabase client not initialized. Check that VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are defined in .env"
    };
  }

  try {
    // Perform a lightweight health probe to the Supabase backend
    const startTime = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        message: `Connection attempt returned an error: ${error.message}`,
        latencyMs: latency
      };
    }

    return {
      success: true,
      message: "Successfully connected to Supabase backend instance.",
      projectHost: new URL(supabaseUrl).hostname,
      latencyMs: latency
    };
  } catch (err) {
    return {
      success: false,
      message: `Network or configuration error: ${err.message}`
    };
  }
}
