/**
 * Sahaaya Supabase bridge
 *
 * Portal controllers are classic scripts, while Vite exposes environment
 * variables to ES modules. This bridge initializes the shared client before
 * DOMContentLoaded handlers run and makes it available to SahaayaAuth.
 */
import { supabase } from "./supabase.js";

window._supabaseClient = supabase;

if (!supabase) {
  console.warn(
    "Sahaaya: Supabase is not configured. Set VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in Vercel/local env."
  );
}
