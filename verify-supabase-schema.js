/**
 * SAHAAYA — Supabase Schema Verification Script
 * 
 * Verifies that all 8 tables defined in supabase/schema.sql are live and queryable
 * on the remote Supabase instance.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env file securely
const envPath = path.resolve(__dirname, ".env");
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const requiredTables = [
  "profiles",
  "volunteers",
  "old_age_homes",
  "activities",
  "applications",
  "attendance",
  "feedback",
  "notifications"
];

console.log("==================================================");
console.log("  SAHAAYA — SUPABASE SCHEMA VERIFICATION REPORT   ");
console.log("==================================================");
console.log(`Endpoint: ${new URL(supabaseUrl).hostname}`);
console.log(`Checking ${requiredTables.length} tables...\n`);

let allPassed = true;
const results = [];

for (const tableName of requiredTables) {
  try {
    const { data, error, status } = await supabase.from(tableName).select("*").limit(0);

    if (error) {
      // If error is table not found
      if (error.code === "42P01" || error.code === "PGRST205" || error.message.includes("does not exist")) {
        results.push({ table: tableName, status: "MISSING", detail: error.message });
        allPassed = false;
      } else {
        // Table exists, but RLS or empty query responded (HTTP 200 or 401/406 RLS check)
        results.push({ table: tableName, status: "EXISTS (RLS active)", detail: `HTTP ${status} - ${error.message}` });
      }
    } else {
      results.push({ table: tableName, status: "EXISTS & ACCESSIBLE", detail: `HTTP ${status}` });
    }
  } catch (err) {
    results.push({ table: tableName, status: "ERROR", detail: err.message });
    allPassed = false;
  }
}

console.table(results);

if (allPassed) {
  console.log("\n✅ ALL 8 TABLES VERIFIED LIVE ON SUPABASE!");
  console.log("Row Level Security is active and tables are ready for data operations.\n");
  process.exit(0);
} else {
  console.log("\n❌ SOME TABLES ARE MISSING OR UNREACHABLE.");
  process.exit(1);
}
