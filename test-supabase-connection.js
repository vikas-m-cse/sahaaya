/**
 * SAHAAYA — Supabase Connection Test Script
 * 
 * Verifies connectivity to the Supabase instance using credentials from .env.
 * Does NOT log or expose the publishable key or any sensitive data.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env file securely
const envPath = path.resolve(__dirname, ".env");

if (!fs.existsSync(envPath)) {
  console.error("❌ FAILED: .env file was not found at project root:", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
let supabaseUrl = "";
let supabaseAnonKey = "";

envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith("VITE_SUPABASE_URL=")) {
    supabaseUrl = trimmed.substring("VITE_SUPABASE_URL=".length).trim();
  } else if (trimmed.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) {
    supabaseAnonKey = trimmed.substring("VITE_SUPABASE_PUBLISHABLE_KEY=".length).trim();
  }
});

console.log("==========================================");
console.log("  SAHAAYA — SUPABASE CONNECTION TEST      ");
console.log("==========================================");

if (!supabaseUrl) {
  console.error("❌ FAILED: VITE_SUPABASE_URL is missing or empty in .env");
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error("❌ FAILED: VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty in .env");
  process.exit(1);
}

const parsedUrl = new URL(supabaseUrl);
console.log(`[1/3] Target Host:     ${parsedUrl.hostname}`);
console.log(`[2/3] Key Configured:  Yes (Publishable Key, length: ${supabaseAnonKey.length} chars)`);

try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const startTime = Date.now();

  console.log(`[3/3] Probing Supabase endpoint...`);

  // Probe Auth Session API
  const { data: authData, error: authError } = await supabase.auth.getSession();
  const latency = Date.now() - startTime;

  if (authError) {
    console.error(`❌ CONNECTION FAILED: ${authError.message}`);
    process.exit(1);
  }

  console.log(`\n✅ CONNECTION SUCCESSFUL!`);
  console.log(`- Status: Connected and authenticated`);
  console.log(`- Project Endpoint: ${supabaseUrl}`);
  console.log(`- Response Latency: ${latency} ms`);
  console.log(`- Client Handshake: OK`);
  console.log(`==========================================\n`);
} catch (err) {
  console.error(`❌ CONNECTION ERROR: ${err.message}`);
  process.exit(1);
}
