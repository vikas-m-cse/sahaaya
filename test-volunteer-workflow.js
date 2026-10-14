import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const store = new Map();
const localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};
const context = vm.createContext({ localStorage, console, module: { exports: {} } });
vm.runInContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "js/db.js"), "utf8"), context);
const db = context.module.exports;
const config = vm.runInContext("SAHAAYA_CONFIG", context);

async function rejectsWith(promise, message) {
  await assert.rejects(promise, error => error instanceof Error && error.message.includes(message));
}

await db.resetToDemoSeed();

const opp = await db.createOpportunity({
  home_id: "home_01",
  title: "Workflow test — present",
  category: "companionship",
  description: "Automated workflow test",
  date: "2099-01-01",
  time_start: "10:00 AM",
  time_end: "11:30 AM",
  duration_hours: 1.5,
  spots_needed: 1
});
const volunteerId = "usr_vol_02";
const app = await db.submitApplication({ opportunity_id: opp.id, volunteer_id: volunteerId, volunteer_note: "Test application" });
assert.equal(app.status, config.APPLICATION_STATUS.APPLIED);
await rejectsWith(db.submitApplication({ opportunity_id: opp.id, volunteer_id: volunteerId }), "already have an active");
await db.updateApplicationStatus(app.id, config.APPLICATION_STATUS.APPROVED, "Approved for test");
assert.equal((await db.getApplicationById(app.id)).status, config.APPLICATION_STATUS.APPROVED);
const updatedOpp = await db.getOpportunityById(opp.id);
assert.equal(updatedOpp.spots_filled, 1);
assert.equal(updatedOpp.status, config.OPPORTUNITY_STATUS.FILLED);
await rejectsWith(db.updateApplicationStatus(app.id, config.APPLICATION_STATUS.APPROVED), "Only pending applications");

const beforeProfile = await db.getVolunteerProfileByUserId(volunteerId);
const beforeHours = Number(beforeProfile.total_hours);
const beforeCount = Number(beforeProfile.completed_count);
const attendance = await db.recordAttendance({ applicationId: app.id, status: "present", markedByUserId: "usr_home_01" });
assert.equal(attendance.hours_credited, 1.5);
assert.equal((await db.getApplicationById(app.id)).status, config.APPLICATION_STATUS.ATTENDED);
const afterProfile = await db.getVolunteerProfileByUserId(volunteerId);
assert.equal(Number(afterProfile.total_hours), Number((beforeHours + 1.5).toFixed(1)));
assert.equal(Number(afterProfile.completed_count), beforeCount + 1);
await rejectsWith(db.recordAttendance({ applicationId: app.id, status: "present", markedByUserId: "usr_home_01" }), "already been recorded");
const stats = await db.getPlatformStats();
assert.ok(stats.completed_sessions_count >= 1);
assert.ok(stats.total_hours_volunteered >= 1.5);

const absentOpp = await db.createOpportunity({
  home_id: "home_01",
  title: "Workflow test — absent",
  category: "companionship",
  description: "Automated absent test",
  date: "2099-01-02",
  time_start: "10:00 AM",
  time_end: "12:00 PM",
  duration_hours: 2,
  spots_needed: 2
});
const absentApp = await db.submitApplication({ opportunity_id: absentOpp.id, volunteer_id: "usr_vol_03" });
await db.updateApplicationStatus(absentApp.id, config.APPLICATION_STATUS.APPROVED);
const absentRecord = await db.recordAttendance({ applicationId: absentApp.id, status: "absent", markedByUserId: "usr_home_01" });
assert.equal(absentRecord.hours_credited, 0);
assert.equal((await db.getApplicationById(absentApp.id)).status, config.APPLICATION_STATUS.ABSENT);
await rejectsWith(db.recordAttendance({ applicationId: absentApp.id, status: "present", markedByUserId: "usr_home_01" }), "already been recorded");

const closedOpp = await db.createOpportunity({
  home_id: "home_01", title: "Closed opportunity test", category: "companionship",
  description: "Closed", date: "2099-01-03", time_start: "10:00 AM",
  time_end: "11:00 AM", duration_hours: 1, spots_needed: 1, status: config.OPPORTUNITY_STATUS.CANCELLED
});
await rejectsWith(db.submitApplication({ opportunity_id: closedOpp.id, volunteer_id: "usr_vol_01" }), "no longer accepting");

console.log("PASS: application creation and duplicate prevention");
console.log("PASS: approval, capacity status, and repeated-approval guard");
console.log("PASS: present attendance credits hours exactly once");
console.log("PASS: absent attendance credits zero hours and cannot be repeated");
console.log("PASS: closed opportunities reject applications");
console.log("PASS: platform attendance/hour analytics return valid counts");
