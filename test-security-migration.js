import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

console.log("Sahaaya security migration checks passed.");
