import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("./supabase/schema.sql", import.meta.url), "utf8");
const adapter = readFileSync(new URL("./js/supabase-db-adapter.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("./js/auth.js", import.meta.url), "utf8");

const migration = readFileSync(
  new URL("./supabase/migrations/20261014_workflow_security_hardening.sql", import.meta.url),
  "utf8"
);

for (const required of [
  "prevent_profile_role_escalation",
  "prevent_home_verification_tampering",
  "DROP POLICY IF EXISTS \"Homes can review applications; Volunteers can cancel\" ON public.applications",
  "DROP POLICY IF EXISTS \"Host homes can mark attendance\" ON public.attendance",
  "DROP POLICY IF EXISTS \"Host homes can update attendance\" ON public.attendance",
  "public.review_application",
  "public.mark_activity_attendance",
  "FOR UPDATE",
  "No volunteer places remain for this activity",
  "Attendance has already been recorded for this volunteer",
  "GRANT EXECUTE ON FUNCTION public.review_application",
  "GRANT EXECUTE ON FUNCTION public.mark_activity_attendance"
]) {
  assert.ok(migration.includes(required), `Missing security/workflow guard: ${required}`);
}

assert.match(migration, /NEW\.role\s*=\s*'admin'/);
assert.match(migration, /NEW\.verification_status IS DISTINCT FROM OLD\.verification_status/);
assert.match(migration, /WHEN p_status = 'present'[\s\S]*ELSE 0/);


for (const [label, source, pattern] of [
  ["Unique application per volunteer/activity", schema, /UNIQUE \(activity_id, volunteer_id\)/],
  ["Unique attendance per volunteer/activity", schema, /unique_attendance_record UNIQUE \(activity_id, volunteer_id\)/],
  ["Applications table RLS enabled", schema, /ALTER TABLE public\.applications ENABLE ROW LEVEL SECURITY/],
  ["Attendance table RLS enabled", schema, /ALTER TABLE public\.attendance ENABLE ROW LEVEL SECURITY/],
  ["Adapter uses atomic application review RPC", adapter, /rpc\("review_application"/],
  ["Adapter uses atomic attendance RPC", adapter, /rpc\("mark_activity_attendance"/],
  ["Adapter does not write application status directly", adapter, !/from\("applications"\)\.update\(/.test(adapter)],
  ["Adapter does not write attendance directly", adapter, !/from\("attendance"\)\.(insert|update|upsert)\(/.test(adapter)],
  ["Signup only requests supported self-service roles", auth, /role: "volunteer"/],
  ["Home signup requests home role, not admin", auth, /role: "home"/],
  ["Signup leaves profile creation to the trusted auth trigger", auth, !/from\(["'](?:profiles|volunteers|old_age_homes)["']\)\.upsert\(/.test(auth)],
  ["Session lookup never trusts stale cached real accounts on error", auth, /if \(cached && !cached\.isDemoSession\) setCachedSession\(null\);\s*return null;/],
  ["Missing Supabase client cannot authenticate a cached real account", auth, /if \(!sb\) \{[\s\S]*?return cached && cached\.isDemoSession \? cached : null;/],
  ["Real home sessions expose their linked home ID", auth, /home_id: extra\.home\.id/],
  ["Home portal resolves the current account's own facility", readFileSync(new URL("./js/home-portal.js", import.meta.url), "utf8"), /getHomeByUserId\?\.\(session\.id\)/],
  ["Home requirement cancellation uses a server-checked RPC", adapter, /rpc\("cancel_activity"/],
  ["Cancellation RPC validates owner and preserves attendance history", migration, /public\.cancel_activity[\s\S]*?Only the host home or an administrator can cancel[\s\S]*?attendance history and cannot be deleted/],
  ["Pending homes may save requirements under their own home ID", migration, /CREATE POLICY "Homes can create own activities"[\s\S]*?home_id = public\.get_user_home_id\(\)/],
  ["Public activity discovery remains limited to verified homes or owner/admin", schema, /CREATE POLICY "Activities viewable by all if home verified or if owner"[\s\S]*?verification_status = 'verified'/]
]) {
  const passed = pattern instanceof RegExp ? pattern.test(source) : pattern;
  assert.ok(passed, `Failed security contract: ${label}`);
}

console.log("Sahaaya security and database contract checks passed.");

