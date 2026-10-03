/**
 * SAHAAYA — Supabase Real-Data Layer
 *
 * Maps exactly to the deployed Supabase schema:
 *   profiles        -> id = auth.users.id
 *   volunteers      -> id (own PK), profile_id -> profiles.id
 *   old_age_homes   -> id (own PK), profile_id -> profiles.id
 *   activities      -> id, home_id -> old_age_homes.id
 *   applications    -> id, activity_id, volunteer_id -> volunteers.id
 *   attendance      -> id, activity_id, volunteer_id -> volunteers.id
 *   feedback        -> id, activity_id, volunteer_id, home_id
 *   notifications   -> id, profile_id -> profiles.id
 *
 * CRITICAL DISTINCTIONS:
 *   volunteers.id  != profiles.id (profiles.id = auth UID)
 *   applications.volunteer_id -> volunteers.id (not profiles.id)
 *   attendance.volunteer_id   -> volunteers.id (not profiles.id)
 */
const SahaayaSupabaseDB = (() => {
  function sb() {
    if (window._supabaseClient) return window._supabaseClient;
    if (window.SAHAAYA_SUPABASE_URL && window.SAHAAYA_SUPABASE_KEY && window.supabase) {
      window._supabaseClient = window.supabase.createClient(
        window.SAHAAYA_SUPABASE_URL, window.SAHAAYA_SUPABASE_KEY
      );
      return window._supabaseClient;
    }
    return null;
  }
  function isAvailable() { return !!sb(); }

  // ---- PROFILES ----
  async function getProfile(profileId) {
    const { data, error } = await sb().from('profiles').select('*').eq('id', profileId).single();
    if (error) throw error; return data;
  }
  async function upsertProfile({ id, full_name, email, phone, role }) {
    const { data, error } = await sb().from('profiles').upsert({ id, full_name, email, phone, role }, { onConflict: 'id' }).select().single();
    if (error) throw error; return data;
  }

  // ---- VOLUNTEERS ----
  async function getVolunteerByProfileId(profileId) {
    const { data, error } = await sb().from('volunteers').select('*').eq('profile_id', profileId).maybeSingle();
    if (error) throw error; return data;
  }
  async function getVolunteerById(volunteerId) {
    const { data, error } = await sb().from('volunteers').select('*, profiles(*)').eq('id', volunteerId).single();
    if (error) throw error; return data;
  }
  async function upsertVolunteer({ profile_id, interests, availability, preferred_activity_types, preferred_area }) {
    const { data, error } = await sb().from('volunteers').upsert(
      { profile_id, interests, availability, preferred_activity_types: preferred_activity_types || [], preferred_area: preferred_area || 'Bengaluru' },
      { onConflict: 'profile_id' }
    ).select().single();
    if (error) throw error; return data;
  }
  async function getAllVolunteers() {
    const { data, error } = await sb().from('volunteers').select('*, profiles(id, full_name, email, phone, created_at)');
    if (error) throw error; return data || [];
  }

  // ---- OLD AGE HOMES ----
  async function getHomeByProfileId(profileId) {
    const { data, error } = await sb().from('old_age_homes').select('*').eq('profile_id', profileId).maybeSingle();
    if (error) throw error; return data;
  }
  async function getHomeById(homeId) {
    const { data, error } = await sb().from('old_age_homes').select('*, profiles(full_name, email, phone)').eq('id', homeId).single();
    if (error) throw error; return data;
  }
  async function getAllHomes(filter) {
    filter = filter || {};
    let query = sb().from('old_age_homes').select('*, profiles(full_name, email, phone)');
    if (filter.verification_status) query = query.eq('verification_status', filter.verification_status);
    const { data, error } = await query;
    if (error) throw error; return data || [];
  }
  async function createHome({ profile_id, name, description, address, city, contact_phone }) {
    const { data, error } = await sb().from('old_age_homes').insert({ profile_id, name, description, address, city, contact_phone, verification_status: 'pending' }).select().single();
    if (error) throw error; return data;
  }
  async function updateHome(homeId, updates) {
    const allowed = ['name', 'description', 'address', 'city', 'contact_phone'];
    const safe = {};
    allowed.forEach(k => { if (updates[k] !== undefined) safe[k] = updates[k]; });
    const { data, error } = await sb().from('old_age_homes').update(safe).eq('id', homeId).select().single();
    if (error) throw error; return data;
  }
  async function updateHomeVerification(homeId, verification_status) {
    if (!['verified', 'rejected', 'pending'].includes(verification_status)) throw new Error('Invalid verification status');
    const { data, error } = await sb().from('old_age_homes').update({ verification_status }).eq('id', homeId).select().single();
    if (error) throw error; return data;
  }

  // ---- ACTIVITIES ----
  async function getActivities(filter) {
    filter = filter || {};
    let query = sb().from('activities').select('*, old_age_homes(id, name, city, address, verification_status, contact_phone)');
    if (filter.home_id) query = query.eq('home_id', filter.home_id);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.activity_type) query = query.eq('activity_type', filter.activity_type);
    query = query.order('date', { ascending: true });
    const { data, error } = await query;
    if (error) throw error; return data || [];
  }
  async function getActivityById(activityId) {
    const { data, error } = await sb().from('activities').select('*, old_age_homes(id, name, city, address, verification_status, contact_phone)').eq('id', activityId).single();
    if (error) throw error; return data;
  }
  async function createActivity({ home_id, title, description, activity_type, date, start_time, end_time, volunteers_required }) {
    const { data, error } = await sb().from('activities').insert({ home_id, title, description, activity_type, date, start_time, end_time, volunteers_required, status: 'open' }).select().single();
    if (error) throw error; return data;
  }
  async function updateActivity(activityId, updates) {
    const allowed = ['title', 'description', 'activity_type', 'date', 'start_time', 'end_time', 'volunteers_required', 'status'];
    const safe = {};
    allowed.forEach(k => { if (updates[k] !== undefined) safe[k] = updates[k]; });
    const { data, error } = await sb().from('activities').update(safe).eq('id', activityId).select().single();
    if (error) throw error; return data;
  }

  // ---- APPLICATIONS ----
  async function getApplicationsByVolunteerId(volunteerId) {
    const { data, error } = await sb().from('applications')
      .select('*, activities(id, title, date, start_time, end_time, activity_type, old_age_homes(name, address, city, contact_phone))')
      .eq('volunteer_id', volunteerId).order('applied_at', { ascending: false });
    if (error) throw error; return data || [];
  }
  async function getApplicationsByActivityId(activityId) {
    const { data, error } = await sb().from('applications')
      .select('*, volunteers(id, profile_id, interests, availability, profiles(full_name, email, phone))')
      .eq('activity_id', activityId).order('applied_at', { ascending: false });
    if (error) throw error; return data || [];
  }
  async function getApplicationsForHome(homeId) {
    const { data, error } = await sb().from('applications')
      .select('*, activities!inner(id, title, date, start_time, end_time, home_id), volunteers(id, profile_id, profiles(full_name, email, phone))')
      .eq('activities.home_id', homeId).order('applied_at', { ascending: false });
    if (error) throw error; return data || [];
  }
  async function submitApplication({ activity_id, volunteer_id }) {
    const { data: existing } = await sb().from('applications').select('id, status')
      .eq('activity_id', activity_id).eq('volunteer_id', volunteer_id).maybeSingle();
    if (existing && (existing.status === 'applied' || existing.status === 'approved')) {
      throw new Error('You have already applied for this activity.');
    }
    const { data, error } = await sb().from('applications').insert({ activity_id, volunteer_id, status: 'applied' }).select().single();
    if (error) throw error; return data;
  }
  async function updateApplicationStatus(applicationId, status) {
    if (!['applied','approved','rejected','attended','cancelled'].includes(status)) throw new Error('Invalid status');
    const { data, error } = await sb().from('applications')
      .update({ status, reviewed_at: new Date().toISOString() }).eq('id', applicationId).select().single();
    if (error) throw error;
    if (status === 'approved') {
      const { count } = await sb().from('applications').select('*', { count: 'exact', head: true })
        .eq('activity_id', data.activity_id).in('status', ['approved', 'attended']);
      const act = await getActivityById(data.activity_id);
      if (act && count >= act.volunteers_required) {
        await updateActivity(data.activity_id, { status: 'filled' });
      }
    }
    return data;
  }

  // ---- ATTENDANCE ----
  async function getAttendanceByVolunteerId(volunteerId) {
    const { data, error } = await sb().from('attendance')
      .select('*, activities(id, title, date, start_time, end_time, old_age_homes(name, address))')
      .eq('volunteer_id', volunteerId).order('marked_at', { ascending: false });
    if (error) throw error; return data || [];
  }
  async function getAttendanceByActivityId(activityId) {
    const { data, error } = await sb().from('attendance')
      .select('*, volunteers(id, profiles(full_name, email, phone))').eq('activity_id', activityId);
    if (error) throw error; return data || [];
  }
  async function markAttendance({ activity_id, volunteer_id, status, hours }) {
    if (!['present','absent'].includes(status)) throw new Error('Invalid attendance status');
    const { data, error } = await sb().from('attendance').upsert(
      { activity_id, volunteer_id, status, hours: status === 'present' ? (hours || 2.0) : 0.0 },
      { onConflict: 'activity_id,volunteer_id' }
    ).select().single();
    if (error) throw error;
    if (status === 'present') {
      await sb().from('applications').update({ status: 'attended', reviewed_at: new Date().toISOString() })
        .eq('activity_id', activity_id).eq('volunteer_id', volunteer_id);
    }
    return data;
  }

  // ---- FEEDBACK ----
  async function submitFeedback({ activity_id, volunteer_id, home_id, rating, comment }) {
    const { data, error } = await sb().from('feedback').insert({ activity_id, volunteer_id, home_id, rating, comment }).select().single();
    if (error) throw error; return data;
  }
  async function getFeedbackForActivity(activityId) {
    const { data, error } = await sb().from('feedback').select('*, volunteers(profiles(full_name))').eq('activity_id', activityId);
    if (error) throw error; return data || [];
  }

  // ---- NOTIFICATIONS ----
  async function getNotifications(profileId) {
    const { data, error } = await sb().from('notifications').select('*').eq('profile_id', profileId)
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw error; return data || [];
  }
  async function markNotificationRead(notificationId) {
    const { error } = await sb().from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) throw error;
  }
  async function createNotification({ profile_id, title, message, type }) {
    type = type || 'info';
    const { data, error } = await sb().from('notifications').insert({ profile_id, title, message, type }).select().single();
    if (error) throw error; return data;
  }

  // ---- PLATFORM STATS (Admin) ----
  async function getPlatformStats() {
    const [a, b, c, d, e, f, g, att] = await Promise.all([
      sb().from('volunteers').select('*', { count: 'exact', head: true }),
      sb().from('old_age_homes').select('*', { count: 'exact', head: true }),
      sb().from('old_age_homes').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      sb().from('old_age_homes').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      sb().from('activities').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb().from('applications').select('*', { count: 'exact', head: true }),
      sb().from('applications').select('*', { count: 'exact', head: true }).in('status', ['approved', 'attended']),
      sb().from('attendance').select('hours').eq('status', 'present')
    ]);
    const totalHours = (att.data || []).reduce((s, r) => s + parseFloat(r.hours || 0), 0);
    return {
      total_volunteers: a.count || 0, total_homes: b.count || 0,
      verified_homes_count: c.count || 0, pending_homes_count: d.count || 0,
      open_opportunities_count: e.count || 0, total_applications_count: f.count || 0,
      approved_applications_count: g.count || 0,
      total_hours_volunteered: parseFloat(totalHours.toFixed(1)),
      completed_sessions_count: g.count || 0
    };
  }

  return {
    isAvailable,
    getProfile, upsertProfile,
    getVolunteerByProfileId, getVolunteerById, upsertVolunteer, getAllVolunteers,
    getHomeByProfileId, getHomeById, getAllHomes, createHome, updateHome, updateHomeVerification,
    getActivities, getActivityById, createActivity, updateActivity,
    getApplicationsByVolunteerId, getApplicationsByActivityId, getApplicationsForHome, submitApplication, updateApplicationStatus,
    getAttendanceByVolunteerId, getAttendanceByActivityId, markAttendance,
    submitFeedback, getFeedbackForActivity,
    getNotifications, markNotificationRead, createNotification,
    getPlatformStats
  };
})();
window.SahaayaSupabaseDB = SahaayaSupabaseDB;
