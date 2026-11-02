import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  // Public client key only. Never expose a Supabase service-role key in the browser.
  window._supabaseClient = createClient(supabaseUrl, supabaseKey);
  window.SAHAAYA_SUPABASE_URL = supabaseUrl;
  window.SAHAAYA_SUPABASE_KEY = supabaseKey;
} else {
  console.error(
    "Sahaaya authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment."
  );
}
