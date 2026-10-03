/**
 * SAHAAYA — Environment & Public Supabase Configuration Bridge
 *
 * Populates window.SAHAAYA_SUPABASE_URL and window.SAHAAYA_SUPABASE_KEY
 * from Vite's import.meta.env safely at client runtime.
 * Service role keys are never exposed.
 */

if (!window.SAHAAYA_SUPABASE_URL || window.SAHAAYA_SUPABASE_URL.startsWith("%")) {
  window.SAHAAYA_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
}
if (!window.SAHAAYA_SUPABASE_KEY || window.SAHAAYA_SUPABASE_KEY.startsWith("%")) {
  window.SAHAAYA_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
}
