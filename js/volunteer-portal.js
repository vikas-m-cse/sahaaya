/**
 * SAHAAYA — Volunteer Portal Controller (Dual-Mode: Demo + Real Supabase)
 *
 * Depends on globals: SahaayaAuth, SahaayaDB (demo), SahaayaSupabaseDB (real),
 *                     SahaayaMatching, SahaayaUI, SAHAAYA_CONFIG
 *
 * Session shape from SahaayaAuth:
 *   session.id              = profiles.id (auth UID)
 *   session.volunteer_id    = volunteers.id (DISTINCT FK for applications/attendance)
 *   session.isDemoSession   = true if demo role switcher was used
 */

document.addEventListener('DOMContentLoaded', async () => {

  // Keep portal navigation responsive even if authentication or data loading fails.
  const tabButtons = document.querySelectorAll('.portal-tab-btn');
  const tabContents = document.querySelectorAll('.portal-tab-content');
  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabId));
  }
  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  // Bind the profile shortcut immediately; do not wait for auth/data initialization.
  function showPortalInitError(message) {
    console.error('Volunteer portal initialization failed:', message);
    const container = document.querySelector('.portal-container');
    if (!container) return;
    let banner = document.getElementById('volunteerInitError');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'volunteerInitError';
      banner.className = 'portal-notice notice-warning';
      banner.style.cssText = 'margin: 0 0 20px; padding: 14px 18px; border-radius: 12px;';
      container.prepend(banner);
    }
    banner.textContent = 'Volunteer portal initialization error: ' + String(message || 'Unknown error') + '. Navigation remains available; refresh after checking the error.';
  }

  // 1. Auth Guard
  let session;
  try {
    session = await SahaayaAuth.checkAuthGuard('volunteer');
  } catch (error) {
    showPortalInitError(error?.message || error);
    return;
  }
  if (!session) return;

  // 2. Dual-Mode Data Router
  const isDemoMode = !!(session.isDemoSession);
  const isSupabaseReady = !isDemoMode && window.SahaayaSupabaseDB && SahaayaSupabaseDB.isAvailable();
  const volunteerRowId = isSupabaseReady ? (session.volunteer_id || null) : session.id;

  // 3. Populate Header
  const userAvatar      = document.getElementById('userAvatar');
  const userName        = document.getElementById('userName');
  const welcomeGreeting = document.getElementById('welcomeGreeting');
  const logoutBtn       = document.getElementById('logoutBtn');
  const modeBadge       = document.getElementById('sessionModeBadge');

  if (userAvatar)      userAvatar.textContent     = session.avatar_initials || 'VO';
  if (userName)        userName.textContent        = session.name;
  if (welcomeGreeting) welcomeGreeting.textContent = 'Welcome back, ' + (session.name || session.email || 'Volunteer').split(' ')[0] + ' \u{1F44B}';
  if (logoutBtn) logoutBtn.addEventListener('click', () => SahaayaAuth.logout());

  if (modeBadge) {
    modeBadge.textContent = isDemoMode ? '🧪 Demo Mode' : '🔴 Live Data';
    modeBadge.style.cssText = 'font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; background:' + (isDemoMode ? 'rgba(234, 179, 8, 0.12)' : 'rgba(34, 197, 94, 0.12)') + '; color:' + (isDemoMode ? '#fbbf24' : '#4ade80') + '; border: 1px solid' + (isDemoMode ? 'rgba(234, 179, 8, 0.25)' : 'rgba(34, 197, 94, 0.25)') + ';';
  }

  document.getElementById('editProfileQuickBtn')?.addEventListener('click', () => switchTab('profile'));

  // 4. State
  let currentVolunteerProfile = null;
  let allActivities = [];
  let userApplications = [];
  let userAttendance = [];
  let allHomes = [];
  let selectedCategoryFilter = 'all';

  // 5. Tab navigation was registered before authentication so it remains usable during data errors.

  // 6. Data Adapters
  function calcDurationHours(start, end) {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return parseFloat(((eh * 60 + em - sh * 60 - sm) / 60).toFixed(1));
    } catch (e) { return 2.0; }
  }
  function mapTimeToSlot(startTime, date) {
    try {
      const day = new Date(date).getDay();
      const hour = parseInt((startTime || '09:00').split(':')[0], 10);
      if (day === 0 && hour < 12) return 'sun_morning';
      if (day === 0 && hour >= 12) return 'sun_evening';
      if (day === 6 && hour < 12) return 'sat_morning';
      if (day === 6 && hour >= 12) return 'sat_evening';
      return 'weekday_evening';
    } catch (e) { return 'sun_morning'; }
  }
  function adaptActivity(act) {
    const home = act.old_age_homes || {};
    return {
      id: act.id, home_id: act.home_id, title: act.title, category: act.activity_type,
      description: act.description, date: act.date, time_start: act.start_time, time_end: act.end_time,
      duration_hours: calcDurationHours(act.start_time, act.end_time),
      slot_id: mapTimeToSlot(act.start_time, act.date),
      spots_needed: act.volunteers_required, spots_filled: act.spots_filled || 0,
      required_skills: act.required_skills || [], status: act.status,
      _home: { id: act.home_id, name: home.name || 'Senior Care Home', area: home.city || 'Bengaluru', address: home.address || 'Bengaluru', phone: home.contact_phone || '' }
    };
  }
  function adaptApplication(app) {
    const act = app.activities || {};
    const home = act.old_age_homes || {};
    return {
      id: app.id, opportunity_id: app.activity_id, volunteer_id: app.volunteer_id,
      status: app.status, applied_at: app.applied_at, reviewed_at: app.reviewed_at,
      coordinator_note: app.coordinator_note || null,
      match_score: app.match_score || 85,
      match_reasons: app.match_reasons || ['Compatible availability window', 'Interest area match'],
      _activity: { title: act.title, date: act.date, time_start: act.start_time, time_end: act.end_time, home_name: home.name || 'Senior Care Home', home_address: home.address || '' }
    };
  }
  function adaptAttendance(rec) {
    const act = rec.activities || {};
    const home = act.old_age_homes || {};
    return {
      id: rec.id, opportunity_id: rec.activity_id, volunteer_id: rec.volunteer_id,
      date: act.date || '', opportunity_title: act.title || 'Activity',
      home_id: act.home_id, hours_credited: rec.hours || 0, status: rec.status,
      _home_name: home.name || 'Partner Senior Care'
    };
  }

  // 7. Load Data
  async function loadData() {
    if (isSupabaseReady) await loadRealData(); else await loadDemoData();
    renderKPIs(); renderOpportunities(); renderSchedule();
    renderApplicationsTable(); renderAttendanceTable(); renderProfileForm();
  }

  async function loadDemoData() {
    currentVolunteerProfile = await SahaayaDB.getVolunteerProfileByUserId(session.id);
    if (!currentVolunteerProfile) {
      currentVolunteerProfile = await SahaayaDB.updateVolunteerProfile(session.id, {
        bio: 'Passionate community volunteer.', interests: ['companionship', 'recreation'], availability: ['sun_morning', 'sat_evening']
      });
    }
    allHomes = await SahaayaDB.getHomes();
    const opps = await SahaayaDB.getOpportunities({ status: SAHAAYA_CONFIG.OPPORTUNITY_STATUS.OPEN });
    allActivities = opps.map(o => ({ ...o, _home: allHomes.find(h => h.id === o.home_id) || { name: 'Senior Care Home', area: 'Bengaluru', address: '' } }));
    const rawApps = await SahaayaDB.getApplications({ volunteer_id: session.id });
    userApplications = rawApps.map(a => ({
      ...a, _activity: (() => {
        const opp = opps.find(o => o.id === a.opportunity_id) || {};
        const home = allHomes.find(h => h.id === opp.home_id) || {};
        return { title: opp.title, date: opp.date, time_start: opp.time_start, time_end: opp.time_end, home_name: home.name, home_address: home.address };
      })()
    }));
    userAttendance = (await SahaayaDB.getAttendanceHistoryByVolunteer(session.id)).map(r => ({
      ...r, _home_name: (allHomes.find(h => h.id === r.home_id) || {}).name || 'Partner Senior Care'
    }));
  }

  async function loadRealData() {
    let volRow = await SahaayaSupabaseDB.getVolunteerByProfileId(session.id);
    if (!volRow) {
      volRow = await SahaayaSupabaseDB.upsertVolunteer({ profile_id: session.id, interests: ['companionship'], availability: ['sun_morning'], preferred_area: 'Bengaluru' });
    }
    if (volRow) session.volunteer_id = volRow.id;
    currentVolunteerProfile = volRow ? { ...volRow, total_hours: 0, completed_count: 0 } : { profile_id: session.id, interests: [], availability: [], total_hours: 0, completed_count: 0 };

    const vid = session.volunteer_id;
    const attRecords = vid ? await SahaayaSupabaseDB.getAttendanceByVolunteerId(vid) : [];
    const presentRecords = attRecords.filter(r => r.status === 'present');
    currentVolunteerProfile.total_hours = parseFloat(presentRecords.reduce((s, r) => s + parseFloat(r.hours || 0), 0).toFixed(1));
    currentVolunteerProfile.completed_count = presentRecords.length;

    const rawActivities = await SahaayaSupabaseDB.getActivities({ status: 'open' });
    allActivities = rawActivities.map(adaptActivity);
    allHomes = (await SahaayaSupabaseDB.getAllHomes({ verification_status: 'verified' })).map(h => ({ id: h.id, name: h.name, area: h.city, address: h.address }));
    userApplications = vid ? (await SahaayaSupabaseDB.getApplicationsByVolunteerId(vid)).map(adaptApplication) : [];
    userAttendance = attRecords.map(adaptAttendance);
  }

  // 8. KPIs
  function renderKPIs() {
    const totalHours     = currentVolunteerProfile.total_hours || 0;
    const completedCount = currentVolunteerProfile.completed_count || 0;
    const upcomingCount  = userApplications.filter(a => a.status === 'approved').length;
    const pendingCount   = userApplications.filter(a => a.status === 'applied').length;
    setTextSafe('kpiTotalHours', totalHours.toFixed(1));
    setTextSafe('kpiCompleted',  completedCount);
    setTextSafe('kpiUpcoming',   upcomingCount);
    setTextSafe('kpiPendingApps', pendingCount);
    setTextSafe('countOpportunities', allActivities.length);
    setTextSafe('countSchedule',      upcomingCount);
    setTextSafe('countApplications',  userApplications.length);
    setTextSafe('countAttendance',    userAttendance.length);
  }
  function setTextSafe(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }

  // 9. Opportunities
  function buildMatchProfile() {
    return { interests: currentVolunteerProfile.interests || [], availability: currentVolunteerProfile.availability || [] };
  }

  function renderOpportunities() {
    const grid = document.getElementById('volunteerOppGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let filtered = allActivities;
    if (selectedCategoryFilter !== 'all') filtered = allActivities.filter(a => a.category === selectedCategoryFilter);
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-state-icon">🔍</div><h4>No volunteer requirements match this category</h4><p>Try "All Requirements" or check back soon — homes publish new needs weekly.</p><button class="btn-secondary" id="clearFilterBtn">Show All Requirements</button></div>';
      document.getElementById('clearFilterBtn')?.addEventListener('click', () => setCategoryFilter('all'));
      return;
    }
    const matchProfile = buildMatchProfile();
    const withScores = filtered.map(opp => {
      const match   = SahaayaMatching.calculateMatch(matchProfile, opp);
      const home    = opp._home || { name: 'Community Senior Home', area: 'Bengaluru' };
      const applied = userApplications.find(a => a.opportunity_id === opp.id && (a.status === 'applied' || a.status === 'approved'));
      return { opp, match, home, applied };
    });
    withScores.sort((a, b) => b.match.score - a.match.score);
    withScores.forEach(({ opp, match, home, applied }) => {
      const spotsLeft = Math.max(0, (opp.spots_needed || 1) - (opp.spots_filled || 0));
      const matchBadgeCls = match.matchLevel === 'high' ? 'match-high' : match.matchLevel === 'medium' ? 'match-medium' : 'match-general';
      const card = document.createElement('article');
      card.className = 'portal-card';
      card.innerHTML = '<div class="portal-card-header">' + SahaayaUI.getCategoryBadge(opp.category) + '<span class="match-pill ' + matchBadgeCls + '" title="Matched with your interests & schedule">★ ' + match.score + '% Compatibility</span></div>' +
        '<div class="portal-card-body"><div style="font-size: 11px; font-weight: 700; color: var(--portal-muted); margin-bottom: 6px;">🏡 ' + home.name + ' · ' + home.area + '</div><h3>' + opp.title + '</h3><p>' + opp.description + '</p>' +
        '<div class="match-explainer-box"><strong><span>✓</span> Why this matches your profile:</strong><ul>' + match.reasons.map(r => '<li>' + r + '</li>').join('') + '</ul></div>' +
        '<div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--portal-muted); border-top: 1px solid #f1f4ee; padding-top: 12px; margin-top: 12px;"><span>🗓 ' + opp.date + '</span><span>⏱ ' + opp.time_start + ' – ' + opp.time_end + ' (' + opp.duration_hours + ' hrs)</span></div></div>' +
        '<div class="portal-card-footer"><span style="font-size: 12px; font-weight: 600; color: ' + (spotsLeft > 0 ? 'var(--portal-primary)' : '#991b1b') + ';">👥 ' + spotsLeft + ' spot' + (spotsLeft !== 1 ? 's' : '') + ' available</span>' +
        (applied ? '<span class="badge ' + (applied.status === 'approved' ? 'badge-success' : 'badge-warning') + '">' + (applied.status === 'approved' ? 'Approved & Scheduled' : 'Application in Review') + '</span>' :
          '<button class="btn-primary btn-sm apply-btn" data-opp-id="' + opp.id + '">Apply to Help →</button>') + '</div>';
      grid.appendChild(card);
    });
    grid.querySelectorAll('.apply-btn').forEach(btn => btn.addEventListener('click', () => openApplyModal(btn.dataset.oppId)));
  }

  // 10. Category Filters
  function setCategoryFilter(category) {
    selectedCategoryFilter = category;
    document.querySelectorAll('#categoryFilterBar .filter').forEach(b => b.classList.toggle('active', b.dataset.filter === category));
    renderOpportunities();
  }
  document.querySelectorAll('#categoryFilterBar .filter').forEach(btn => btn.addEventListener('click', () => setCategoryFilter(btn.dataset.filter)));

  // 11. Apply Modal
  function openApplyModal(oppId) {
    const opp  = allActivities.find(o => o.id === oppId);
    if (!opp) return;
    const home  = opp._home || { name: 'Partner Senior Home', address: 'Bengaluru' };
    const match = SahaayaMatching.calculateMatch(buildMatchProfile(), opp);
    SahaayaUI.openModal({
      title: 'Confirm Volunteer Application',
      subtitle: 'Requirement posted by ' + home.name,
      bodyHtml: '<div style="background: #f7faf7; border: 1px solid #d5e6d8; border-radius: 14px; padding: 16px; margin-bottom: 20px;"><h4 style="margin: 0 0 6px; font-size: 16px; color: #174e43;">' + opp.title + '</h4><p style="margin: 0; font-size: 13px; color: #52635f;"><strong>When:</strong> ' + opp.date + ' (' + opp.time_start + ' – ' + opp.time_end + ')<br><strong>Where:</strong> ' + home.name + ', ' + (home.address || 'Bengaluru') + '</p></div>' +
        '<div class="match-explainer-box" style="margin-bottom: 18px;"><strong>Match Assessment (' + match.score + '%):</strong><ul>' + match.reasons.map(r => '<li>' + r + '</li>').join('') + '</ul></div>' +
        '<div class="form-group"><label>A quick note to the coordinator (optional):</label><textarea id="appNoteInput" rows="3" placeholder="Tell the coordinator what excites you about this activity..."></textarea><span class="hint">The coordinator will review this alongside your verified profile.</span></div>',
      footerHtml: '<button class="btn-secondary" id="modalCancelBtn">Cancel</button><button class="btn-primary" id="modalSubmitAppBtn">Submit Application →</button>'
    });
    document.getElementById('modalCancelBtn')?.addEventListener('click', SahaayaUI.closeModal);
    document.getElementById('modalSubmitAppBtn')?.addEventListener('click', async () => {
      const note = document.getElementById('appNoteInput')?.value.trim();
      try {
        if (isSupabaseReady) {
          const vid = session.volunteer_id;
          if (!vid) throw new Error('Volunteer profile not found. Please update your profile first.');
          await SahaayaSupabaseDB.submitApplication({ activity_id: opp.id, volunteer_id: vid });
        } else {
          await SahaayaDB.submitApplication({ opportunity_id: opp.id, volunteer_id: session.id, match_score: match.score, match_reasons: match.reasons, volunteer_note: note || 'Looking forward to contributing!' });
        }
        SahaayaUI.closeModal();
        SahaayaUI.showToast('Application submitted! The old age home will review it.', 'success');
        await loadData();
        switchTab('applications');
      } catch (err) { SahaayaUI.showToast(err.message, 'warning'); }
    });
  }

  // 12. Render Schedule
  function renderSchedule() {
    const container = document.getElementById('scheduleContainer');
    if (!container) return;
    container.innerHTML = '';
    const approvedApps = userApplications.filter(a => a.status === 'approved');
    if (approvedApps.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h4>No approved activities on your schedule yet</h4><p>When an old age home approves your application, it will appear here with full venue and timing details.</p><button class="btn-primary" id="scheduleExploreBtn">Browse Open Opportunities →</button></div>';
      document.getElementById('scheduleExploreBtn')?.addEventListener('click', () => switchTab('discover'));
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'portal-grid';
    approvedApps.forEach(app => {
      const opp  = allActivities.find(o => o.id === app.opportunity_id);
      const act  = app._activity || {};
      const home = (opp && opp._home) || { name: act.home_name || 'Senior Care Home', address: act.home_address || 'Bengaluru', phone: '' };
      const card = document.createElement('div');
      card.className = 'portal-card';
      card.innerHTML = '<div class="portal-card-header"><span class="badge badge-success">✓ Scheduled & Confirmed</span><span style="font-size: 11px; font-weight: 700; color: var(--portal-muted);">CREDITS: ' + (opp?.duration_hours || 2) + ' HRS</span></div>' +
        '<div class="portal-card-body"><h3 style="margin-bottom: 6px;">' + (opp?.title || act.title || 'Community Activity') + '</h3><div style="font-size: 12px; color: var(--portal-muted); margin-bottom: 16px;">🏡 <strong>' + home.name + '</strong><br>📍 ' + home.address + '</div>' +
        '<div style="background: #f8faf7; border-radius: 12px; padding: 14px; font-size: 13px; margin-bottom: 16px;"><div><strong>🗓 Date:</strong> ' + (opp?.date || act.date || 'Upcoming') + '</div><div><strong>⏰ Time:</strong> ' + (opp?.time_start || act.time_start) + ' – ' + (opp?.time_end || act.time_end) + '</div><div><strong>👤 Contact:</strong> Coordinator ' + (home.phone ? '(' + home.phone + ')' : '') + '</div></div>' +
        (app.coordinator_note ? '<div style="font-size: 12px; color: #174e43; background: #eef5ef; padding: 10px 12px; border-radius: 8px;"><strong>Coordinator's Note:</strong> "' + app.coordinator_note + '"</div>' : '') + '</div>' +
        '<div class="portal-card-footer"><span style="font-size: 11px; color: var(--portal-muted);">Check-in recorded by home superintendent on arrival.</span><button class="btn-secondary btn-sm directions-btn" data-address="' + encodeURIComponent((home.name || '') + ' ' + (home.address || '')) + '">View on Map ↗</button></div>';
      grid.appendChild(card);
    });
    container.appendChild(grid);
    container.querySelectorAll('.directions-btn').forEach(btn => btn.addEventListener('click', () => window.open('https://www.google.com/maps/search/?api=1&query=' + btn.dataset.address, '_blank')));
  }

  // 13. Render Applications Table
  function renderApplicationsTable() {
    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (userApplications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--portal-muted);">You haven\'t submitted any applications yet.</td></tr>';
      return;
    }
    userApplications.forEach(app => {
      const opp  = allActivities.find(o => o.id === app.opportunity_id);
      const act  = app._activity || {};
      const home = (opp && opp._home) || { name: act.home_name || 'Senior Care Home' };
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + (opp?.title || act.title || 'Community Requirement') + '</strong><br><small style="color: var(--portal-muted);">' + home.name + '</small></td>' +
        '<td>' + (opp?.date || act.date || '—') + '<br><small style="color: var(--portal-muted);">' + (opp?.time_start || act.time_start || '') + ' – ' + (opp?.time_end || act.time_end || '') + '</small></td>' +
        '<td><span class="match-pill match-high" style="font-size: 10px;">★ ' + (app.match_score || '—') + '%</span></td>' +
        '<td>' + SahaayaUI.getStatusBadge(app.status) + '</td>' +
        '<td><span style="font-size: 12px; color: ' + (app.coordinator_note ? 'var(--portal-ink)' : 'var(--portal-muted)') + ';">' + (app.coordinator_note || 'Awaiting coordinator review') + '</span></td>';
      tbody.appendChild(tr);
    });
  }

  // 14. Render Attendance Table
  function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (userAttendance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--portal-muted);">No attendance records yet. Verified hours will appear here after you complete scheduled activities.</td></tr>';
      return;
    }
    userAttendance.forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + record.date + '</strong></td><td>' + (record.opportunity_title || 'Activity') + '</td><td>' + (record._home_name || 'Partner Senior Care') + '</td>' +
        '<td><strong style="color: var(--portal-primary); font-size: 14px;">+' + record.hours_credited + ' hrs</strong></td>' +
        '<td>' + SahaayaUI.getStatusBadge(record.status) + '</td>' +
        '<td><button class="btn-secondary btn-sm feedback-btn" data-record-id="' + record.id + '" data-opp-id="' + (record.opportunity_id || record.activity_id || '') + '">💬 Give Feedback</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.feedback-btn').forEach(btn => btn.addEventListener('click', () => openFeedbackModal(btn.dataset.recordId, btn.dataset.oppId)));
  }

  // 15. Feedback Modal
  function openFeedbackModal(recordId, oppId) {
    SahaayaUI.openModal({
      title: 'Share Activity Experience',
      subtitle: 'Your feedback helps homes understand resident engagement and improve future sessions.',
      bodyHtml: '<div class="form-group"><label>Overall Experience Rating</label><select id="fbRating"><option value="5">⭐⭐⭐⭐⭐ 5 — Truly Heartwarming & Meaningful</option><option value="4">⭐⭐⭐⭐ 4 — Good & Pleasant</option><option value="3">⭐⭐⭐ 3 — Average</option><option value="2">⭐⭐ 2 — Could be improved</option><option value="1">⭐ 1 — Needs attention</option></select></div><div class="form-group"><label>Comments & Observations</label><textarea id="fbComments" rows="3" placeholder="How did the residents respond? Any memorable moments or suggestions?"></textarea></div>',
      footerHtml: '<button class="btn-secondary" id="fbCancel">Close</button><button class="btn-primary" id="fbSubmit">Submit Feedback</button>'
    });
    document.getElementById('fbCancel')?.addEventListener('click', SahaayaUI.closeModal);
    document.getElementById('fbSubmit')?.addEventListener('click', async () => {
      const rating   = parseInt(document.getElementById('fbRating').value, 10);
      const comments = document.getElementById('fbComments').value.trim();
      if (!comments) { SahaayaUI.showToast('Please enter your thoughts before submitting.', 'warning'); return; }
      try {
        if (isSupabaseReady) {
          const opp = allActivities.find(o => o.id === oppId);
          const vid = session.volunteer_id;
          await SahaayaSupabaseDB.submitFeedback({ activity_id: oppId, volunteer_id: vid, home_id: opp?.home_id || '', rating, comment: comments });
        } else {
          await SahaayaDB.submitFeedback({ opportunity_id: oppId, from_user_id: session.id, role_type: 'volunteer_to_home', rating, comments });
        }
        SahaayaUI.closeModal();
        SahaayaUI.showToast('Thank you! Your feedback has been recorded.', 'success');
      } catch (err) { SahaayaUI.showToast('Error: ' + err.message, 'error'); }
    });
  }

  // 16. Profile Form
  function renderProfileForm() {
    setInputSafe('profName',      session.name);
    setInputSafe('profEmail',     session.email);
    setInputSafe('profPhone',     session.phone || '');
    setInputSafe('profEmergency', currentVolunteerProfile.emergency_contact || '');
    setInputSafe('profBio',       currentVolunteerProfile.bio || '');
    const intContainer = document.getElementById('interestsCheckboxes');
    if (intContainer) {
      intContainer.innerHTML = SAHAAYA_CONFIG.CATEGORIES.map(cat =>
        '<label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer;"><input type="checkbox" name="interest" value="' + cat.id + '" ' + ((currentVolunteerProfile.interests || []).includes(cat.id) ? 'checked' : '') + '><span>' + cat.icon + ' ' + cat.label + '</span></label>'
      ).join('');
    }
    const availContainer = document.getElementById('availabilityCheckboxes');
    if (availContainer) {
      availContainer.innerHTML = SAHAAYA_CONFIG.WEEKDAY_SLOTS.map(slot =>
        '<label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer;"><input type="checkbox" name="availability" value="' + slot.id + '" ' + ((currentVolunteerProfile.availability || []).includes(slot.id) ? 'checked' : '') + '><span>' + slot.label + '</span></label>'
      ).join('');
    }
    const form = document.getElementById('volunteerProfileForm');
    if (!form) return;
    const freshForm = form.cloneNode(true);
    form.parentNode.replaceChild(freshForm, form);
    freshForm.addEventListener('submit', async e => {
      e.preventDefault();
      const updatedInterests    = Array.from(freshForm.querySelectorAll("input[name='interest']:checked")).map(cb => cb.value);
      const updatedAvailability = Array.from(freshForm.querySelectorAll("input[name='availability']:checked")).map(cb => cb.value);
      try {
        if (isSupabaseReady) {
          await SahaayaSupabaseDB.upsertVolunteer({ profile_id: session.id, interests: updatedInterests, availability: updatedAvailability, preferred_area: currentVolunteerProfile.preferred_area || 'Bengaluru' });
        } else {
          await SahaayaDB.updateVolunteerProfile(session.id, { bio: document.getElementById('profBio')?.value.trim(), emergency_contact: document.getElementById('profEmergency')?.value.trim(), interests: updatedInterests, availability: updatedAvailability });
        }
        currentVolunteerProfile.interests = updatedInterests;
        currentVolunteerProfile.availability = updatedAvailability;
        SahaayaUI.showToast('Profile preferences saved! Compatibility scores updated.', 'success');
        renderOpportunities();
      } catch (err) { SahaayaUI.showToast('Error saving profile: ' + err.message, 'error'); }
    });
  }
  function setInputSafe(id, value) { const el = document.getElementById(id); if (el) el.value = value; }

  // Print
  document.getElementById('downloadCertBtn')?.addEventListener('click', () => window.print());

  // 17. Initial Load
  try {
    await loadData();
  } catch (error) {
    showPortalInitError(error?.message || error);
  }
});
