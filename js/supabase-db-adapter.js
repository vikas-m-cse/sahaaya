/**
 * Sahaaya Supabase repository adapter.
 *
 * Uses the authenticated Supabase session for real accounts and preserves the
 * existing LocalStorage demo experience only for explicit demo sessions.
 * IDs and fields are translated between the UI's legacy model and SQL schema.
 */
(() => {
  const sb = () => window._supabaseClient || null;
  const original = window.SahaayaDB;
  if (!original) return;

  async function realSession() {
    const client = sb();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }
  async function useRemote() {
    const session = await realSession();
    const cached = window.SahaayaAuth?.getCachedSession?.();
    return Boolean(session && session.user && !(cached && cached.isDemoSession));
  }
  function must(result) {
    if (result?.error) throw new Error(result.error.message || "Supabase request failed");
    return result?.data;
  }
  const client = () => {
    const value = sb();
    if (!value) throw new Error("Supabase is not configured. Add the Vite environment variables and redeploy.");
    return value;
  };
  const time12 = (value) => {
    if (!value) return "";
    const [h, m] = String(value).slice(0, 5).split(":").map(Number);
    const hour = h % 12 || 12;
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const time24 = (value) => {
    if (!value) return "09:00";
    const match = String(value).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return value;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  };
  async function profiles() {
    return must(await client().from("profiles").select("*").order("created_at", { ascending: false }));
  }
  async function homes() {
    return must(await client().from("old_age_homes").select("*").order("created_at", { ascending: false }));
  }
  async function activities() {
    const rows = must(await client().from("activities").select("*").order("date", { ascending: true }));
    return rows.map(a => ({
      id: a.id, home_id: a.home_id, title: a.title, description: a.description,
      category: a.activity_type, date: a.date, time_start: time12(a.start_time),
      time_end: time12(a.end_time), duration_hours: Math.max(0,
        (new Date(`1970-01-01T${a.end_time}`) - new Date(`1970-01-01T${a.start_time}`)) / 3600000),
      spots_needed: a.volunteers_required, spots_filled: 0, status: a.status,
      created_at: a.created_at, required_skills: [], slot_id: ""
    }));
  }
  async function applications() {
    const rows = must(await client().from("applications").select("*").order("applied_at", { ascending: false }));
    const [acts, vols, profs] = await Promise.all([
      activities(),
      must(await client().from("volunteers").select("*")),
      profiles()
    ]);
    const volunteerProfiles = new Map(profs.map(p => [p.id, p]));
    const volById = new Map(vols.map(v => [v.id, v]));
    return rows.map(a => {
      const volunteer = volById.get(a.volunteer_id);
      const profile = volunteer && volunteerProfiles.get(volunteer.profile_id);
      return {
        id: a.id, opportunity_id: a.activity_id, volunteer_id: profile?.id || a.volunteer_id,
        status: a.status, applied_at: a.applied_at, reviewed_at: a.reviewed_at,
        coordinator_note: a.coordinator_note || "", volunteer_note: a.volunteer_note || "",
        match_score: 0, match_reasons: []
      };
    });
  }

  const remote = {
    getUsers: async () => {
      const [ps, vs, hs] = await Promise.all([
        profiles(), must(await client().from("volunteers").select("*")), homes()
      ]);
      const vMap = new Map(vs.map(v => [v.profile_id, v]));
      const hMap = new Map(hs.map(h => [h.profile_id, h]));
      return ps.map(p => {
        const h = hMap.get(p.id);
        return {
          id: p.id, name: p.full_name, email: p.email, phone: p.phone || "",
          role: p.role, avatar_initials: (p.full_name || "S").split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase(),
          created_at: p.created_at, home_id: h?.id || null
        };
      });
    },
    getUserById: async id => (await remote.getUsers()).find(u => u.id === id) || null,
    getUserByEmail: async email => (await remote.getUsers()).find(u => u.email.toLowerCase() === email.toLowerCase()) || null,
    getVolunteerProfileByUserId: async userId => {
      const row = must(await client().from("volunteers").select("*, profiles!inner(full_name,phone,email)").eq("profile_id", userId).maybeSingle());
      if (!row) return null;
      const attendance = must(await client().from("attendance").select("hours,status").eq("volunteer_id", row.id));
      return { id: row.id, user_id: row.profile_id, interests: row.interests || [], availability: row.availability || [],
        total_hours: attendance.filter(a => a.status === "present").reduce((n, a) => n + Number(a.hours || 0), 0),
        completed_count: attendance.filter(a => a.status === "present").length, bio: "", emergency_contact: "" };
    },
    updateVolunteerProfile: async (userId, patch) => {
      const allowed = {};
      for (const key of ["interests", "availability", "preferred_activity_types", "preferred_area"]) if (patch[key] !== undefined) allowed[key] = patch[key];
      const row = must(await client().from("volunteers").update(allowed).eq("profile_id", userId).select().single());
      return { ...row, user_id: row.profile_id };
    },
    getHomes: async (filter = {}) => {
      let rows = await homes();
      if (filter.verification_status) rows = rows.filter(h => h.verification_status === filter.verification_status);
      const ps = await profiles();
      const byId = new Map(ps.map(p => [p.id, p]));
      return rows.map(h => ({ id: h.id, user_id: h.profile_id, name: h.name, description: h.description,
        address: h.address, area: h.city, city: h.city, contact_person: byId.get(h.profile_id)?.full_name || "",
        contact_phone: h.contact_phone, verification_status: h.verification_status, resident_count: 0,
        registration_number: "", verification_notes: "" }));
    },
    getHomeById: async id => (await remote.getHomes()).find(h => h.id === id) || null,
    getHomeByUserId: async id => (await remote.getHomes()).find(h => h.user_id === id) || null,
    updateHomeStatus: async (id, status) => {
      const row = must(await client().from("old_age_homes").update({ verification_status: status }).eq("id", id).select().single());
      return row;
    },
    getOpportunities: async filters => {
      let rows = await activities();
      if (filters?.home_id) rows = rows.filter(a => a.home_id === filters.home_id);
      if (filters?.category && filters.category !== "all") rows = rows.filter(a => a.category === filters.category);
      if (filters?.status) rows = rows.filter(a => a.status === filters.status);
      const apps = must(await client().from("applications").select("activity_id,status"));
      const counts = new Map();
      for (const a of apps) if (["approved", "attended"].includes(a.status)) counts.set(a.activity_id, (counts.get(a.activity_id) || 0) + 1);
      return rows.map(a => ({ ...a, spots_filled: counts.get(a.id) || 0 }));
    },
    getOpportunityById: async id => (await remote.getOpportunities()).find(a => a.id === id) || null,
    createOpportunity: async data => {
      const row = must(await client().from("activities").insert({
        home_id: data.home_id, title: data.title, description: data.description,
        activity_type: data.category, date: data.date, start_time: time24(data.time_start),
        end_time: time24(data.time_end), volunteers_required: Number(data.spots_needed || 1),
        status: "open"
      }).select().single());
      return { ...row, category: row.activity_type, time_start: time12(row.start_time), time_end: time12(row.end_time),
        spots_needed: row.volunteers_required, spots_filled: 0, duration_hours: Math.max(0,
          (new Date(`1970-01-01T${row.end_time}`) - new Date(`1970-01-01T${row.start_time}`)) / 3600000) };
    },
    updateOpportunity: async (id, data) => {
      const patch = {};
      if (data.title !== undefined) patch.title = data.title;
      if (data.description !== undefined) patch.description = data.description;
      if (data.status !== undefined) patch.status = data.status;
      if (data.date !== undefined) patch.date = data.date;
      if (data.spots_needed !== undefined) patch.volunteers_required = Number(data.spots_needed);
      const row = must(await client().from("activities").update(patch).eq("id", id).select().single());
      return row;
    },
    cancelOpportunity: async id => must(await client().rpc("cancel_activity", {
      p_activity_id: id
    })),
    getApplications: async filter => {
      let rows = await applications();
      if (filter?.volunteer_id) rows = rows.filter(a => a.volunteer_id === filter.volunteer_id);
      if (filter?.opportunity_id) rows = rows.filter(a => a.opportunity_id === filter.opportunity_id);
      if (filter?.status) rows = rows.filter(a => a.status === filter.status);
      return rows;
    },
    getApplicationById: async id => (await applications()).find(a => a.id === id) || null,
    submitApplication: async data => {
      const volunteerId = must(await client().from("volunteers").select("id").eq("profile_id", data.volunteer_id).single()).id;
      const row = must(await client().from("applications").insert({
        activity_id: data.opportunity_id, volunteer_id: volunteerId, status: "applied",
        volunteer_note: data.volunteer_note || null
      }).select().single());
      return { ...row, opportunity_id: row.activity_id, volunteer_id: data.volunteer_id, match_score: data.match_score || 0,
        match_reasons: data.match_reasons || [], volunteer_note: data.volunteer_note || "", coordinator_note: "" };
    },
    updateApplicationStatus: async (id, status, note = "") => {
      if (!["approved", "rejected"].includes(status)) {
        throw new Error("Only approval or rejection can be submitted through application review.");
      }
      const row = must(await client().rpc("review_application", {
        p_application_id: id,
        p_status: status,
        p_coordinator_note: note || null
      }));
      return { ...row, opportunity_id: row.activity_id, coordinator_note: row.coordinator_note || note || "" };
    },
    recordAttendance: async ({ applicationId, status }) => {
      if (!["present", "absent"].includes(status)) {
        throw new Error("Attendance status must be present or absent.");
      }
      const app = must(await client().from("applications").select("id,activity_id,volunteer_id").eq("id", applicationId).single());
      const act = must(await client().from("activities").select("title,date").eq("id", app.activity_id).single());
      const row = must(await client().rpc("mark_activity_attendance", {
        p_application_id: applicationId,
        p_status: status
      }));
      return {
        ...row,
        opportunity_id: row.activity_id,
        hours_credited: Number(row.hours || 0),
        opportunity_title: act.title,
        date: act.date
      };
    },
    getAttendanceHistoryByVolunteer: async userId => {
      const volunteer = must(await client().from("volunteers").select("id").eq("profile_id", userId).single());
      const rows = must(await client().from("attendance").select("*, activities(title,date)").eq("volunteer_id", volunteer.id).order("marked_at", { ascending: false }));
      return rows.map(a => ({ ...a, opportunity_id: a.activity_id, opportunity_title: a.activities?.title || "Activity",
        date: a.activities?.date, hours_credited: Number(a.hours) }));
    },
    submitFeedback: async data => {
      const volunteer = must(await client().from("volunteers").select("id").eq("profile_id", data.from_user_id).single());
      const activityId = data.opportunity_id;
      const activity = must(await client().from("activities").select("home_id").eq("id", activityId).single());
      return must(await client().from("feedback").insert({ activity_id: activityId, volunteer_id: volunteer.id,
        home_id: activity.home_id, rating: Number(data.rating), comment: data.comments || data.comment || "" }).select().single());
    },
    getFeedbackForOpportunity: async id => must(await client().from("feedback").select("*").eq("activity_id", id)),
    getPlatformStats: async () => {
      const [ps, hs, acts, apps, attendance] = await Promise.all([profiles(), homes(), activities(),
        must(await client().from("applications").select("status")), must(await client().from("attendance").select("status,hours"))]);
      return { total_volunteers: ps.filter(p => p.role === "volunteer").length, total_homes: hs.length,
        verified_homes_count: hs.filter(h => h.verification_status === "verified").length,
        pending_homes_count: hs.filter(h => h.verification_status === "pending").length,
        open_opportunities_count: acts.filter(a => a.status === "open").length, total_applications_count: apps.length,
        approved_applications_count: apps.filter(a => ["approved", "attended"].includes(a.status)).length,
        total_hours_volunteered: Number(attendance.filter(a => a.status === "present").reduce((n, a) => n + Number(a.hours || 0), 0).toFixed(1)),
        completed_sessions_count: attendance.filter(a => a.status === "present").length };
    }
  };

  for (const [name, method] of Object.entries(remote)) {
    const demoMethod = original[name];
    if (typeof demoMethod !== "function") continue;
    original[name] = async (...args) => (await useRemote()) ? method(...args) : demoMethod(...args);
  }
  window.SahaayaDB = original;
})();
