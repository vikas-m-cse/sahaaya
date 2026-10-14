/**
 * Sahaaya runtime bootstrap.
 *
 * Initializes the Vite-configured Supabase client before loading the legacy
 * plain-script controllers. No service-role key belongs in these variables.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  window._supabaseClient = createClient(supabaseUrl, supabaseKey);
  window.SAHAAYA_SUPABASE_URL = supabaseUrl;
  window.SAHAAYA_SUPABASE_KEY = supabaseKey;
} else {
  console.error(
    "Sahaaya: Supabase is not configured. Set VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in the Vite/Vercel environment."
  );
}

const isPortal = /\/(volunteer|home|admin)\//.test(window.location.pathname);
const root = isPortal ? "../" : "./";
const scripts = isPortal
  ? [
      "js/config.js",
      "js/db.js",
      "js/matching.js",
      "js/auth.js",
      "js/supabase-db-adapter.js",
      "js/components.js",
      window.location.pathname.includes("/volunteer/") ? "js/volunteer-portal.js" :
        window.location.pathname.includes("/home/") ? "js/home-portal.js" : "js/admin-portal.js"
    ]
  : ["js/config.js", "js/db.js", "js/matching.js", "js/auth.js", "js/supabase-db-adapter.js", "js/components.js", "app.js"];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(src, new URL(root, window.location.href)).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load Sahaaya script: ${src}`));
    document.body.appendChild(script);
  });
}

async function bootstrap() {
  try {
    for (const script of scripts) await loadScript(script);
    if (!isPortal) {
      await loadScript("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js");
      await loadScript("js/sahaaya-3d.js");
    }
  } catch (error) {
  console.error(error);
  const notice = document.createElement("div");
  notice.setAttribute("role", "alert");
  notice.style.cssText = "position:fixed;z-index:99999;bottom:16px;left:16px;right:16px;padding:14px 18px;background:#fff4e5;color:#5b3710;border:1px solid #e6c18b;border-radius:12px;font:14px/1.5 system-ui";
  notice.textContent = "Sahaaya could not load all application scripts. Refresh the page or check the deployment build logs.";
    document.body.appendChild(notice);
  }
}

void bootstrap();
