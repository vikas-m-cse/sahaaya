/**
 * SAHAAYA — Platform Admin Portal Controller (Dual-Mode)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await SahaayaAuth.checkAuthGuard('admin');
  if (!session) return;

  const isDemoMode = !!(session.isDemoSession);
  const isSupabaseReady = !isDemoMode && window.SahaayaSupabaseDB && SahaayaSupabaseDB.isAvailable();

  const logoutBtn       = document.getElementById('logoutBtn');
  const exportReportBtn = document.getElementById('exportReportBtn');
  logoutBtn?.addEventListener('click', () => SahaayaAuth.logout());
  exportReportBtn?.addEventListener('click', () => window.print());

  let allHomes = [], allVolunteers = [], allApplications = [], allActivities = [];

  const tabButtons  = document.querySelectorAll('.portal-tab-btn');
  const tabContents = document.querySelectorAll('.portal-tab-content');
  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabId));
  }
  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  async function loadData() {
    if (isSupabaseReady) await loadRealData(); else await loadDemoData();
    renderKPIs(); renderVerificationQueue(); renderVolunteerDirectory(); renderPipelineTable(); renderAllHomesTable();
  }

  async function loadDemoData() {
    allHomes = await SahaayaDB.getHomes();
    const users = await SahaayaDB.getUsers();
    allVolunteers = users.filter(u => u.role === 'volunteer').map(v => {
      return { id: v.id, profiles: { full_name: v.name, email: v.email, phone: v.phone, created_at: v.created_at }, interests: [], availability: [], total_hours: 0, completed_count: 0 };
    });
    for (const v of allVolunteers) {
      const p = await SahaayaDB.getVolunteerProfileByUserId(v.id);
      if (p) { v.interests = p.interests; v.availability = p.availability; v.total_hours = p.total_hours; v.completed_count = p.completed_count; }
    }
    allApplications = await SahaayaDB.getApplications();
    allActivities   = await SahaayaDB.getOpportunities();
  }

  async function loadRealData() {
    try {
      allHomes       = await SahaayaSupabaseDB.getAllHomes();
      allVolunteers  = await SahaayaSupabaseDB.getAllVolunteers();
      allActivities  = await SahaayaSupabaseDB.getActivities();
      // Applications need home context; load all via activities
      allApplications = [];
      for (const act of allActivities) {
        const apps = await SahaayaSupabaseDB.getApplicationsByActivityId(act.id);
        allApplications.push(...apps.map(a => ({ ...a, _activity: act, _home: act.old_age_homes || {} })));
      }
    } catch (err) { console.error('Admin data load error:', err); }
  }

  function renderKPIs() {
    const pendingHomes = allHomes.filter(h => h.verification_status === 'pending');
    const totalHours = allVolunteers.reduce((sum, v) => sum + parseFloat(v.total_hours || 0), 0);
    setTextSafe('kpiPlatformHours',       totalHours.toFixed(1));
    setTextSafe('kpiHomesCount',          allHomes.length);
    setTextSafe('kpiVolunteersCount',     allVolunteers.length);
    setTextSafe('kpiPendingVerification', pendingHomes.length);
    setTextSafe('countPendingQueue',      pendingHomes.length);
  }
  function setTextSafe(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }

  function renderVerificationQueue() {
    const container = document.getElementById('verificationQueueContainer');
    if (!container) return;
    container.innerHTML = '';
    const pendingHomes = allHomes.filter(h => h.verification_status === 'pending');
    if (pendingHomes.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛡️</div><h4>All registered senior homes are verified</h4><p>No new applications in the verification queue. Any newly registered old age homes will appear here for administrative vetting.</p></div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'portal-grid';
    pendingHomes.forEach(home => {
      const card = document.createElement('div');
      card.className = 'portal-card';
      card.innerHTML = '<div class="portal-card-header"><span class="badge badge-warning">Verification Required</span><span style="font-size: 11px; font-weight: 700; color: var(--portal-muted);">REG: ' + (home.registration_number || 'Pending') + '</span></div>' +
        '<div class="portal-card-body"><h3 style="margin-bottom: 4px;">' + home.name + '</h3><div style="font-size: 12px; color: var(--portal-muted); margin-bottom: 14px;">📍 ' + (home.address || '') + ' (' + (home.city || home.area || '') + ')<br>👤 Coordinator: <strong>' + ((home.profiles && home.profiles.full_name) || home.contact_person || 'N/A') + '</strong></div>' +
        '<div style="background: #fdfaf3; border: 1px solid #fae8c8; border-radius: 12px; padding: 14px; margin-bottom: 14px; font-size: 13px;"><div><strong>About:</strong> ' + (home.description || 'Senior care residence.') + '</div><div style="margin-top: 6px; color: #8a6100; font-size: 12px;"><strong>Status:</strong> Awaiting verification</div></div></div>' +
        '<div class="portal-card-footer"><button class="btn-danger btn-sm decline-home-btn" data-home-id="' + home.id + '">Decline</button><button class="btn-primary btn-sm verify-home-btn" data-home-id="' + home.id + '" data-name="' + home.name + '">Approve & Verify Partner ✓</button></div>';
      grid.appendChild(card);
    });
    container.appendChild(grid);
    grid.querySelectorAll('.verify-home-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          if (isSupabaseReady) { await SahaayaSupabaseDB.updateHomeVerification(btn.dataset.homeId, 'verified'); }
          else { await SahaayaDB.updateHomeStatus(btn.dataset.homeId, SAHAAYA_CONFIG.HOME_STATUS.VERIFIED, 'Verified by platform admin.'); }
          SahaayaUI.showToast('Verified ' + btn.dataset.name + '! Home is now eligible to publish volunteer requirements.', 'success');
          await loadData();
        } catch (err) { SahaayaUI.showToast('Error: ' + err.message, 'error'); }
      });
    });
    grid.querySelectorAll('.decline-home-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          if (isSupabaseReady) { await SahaayaSupabaseDB.updateHomeVerification(btn.dataset.homeId, 'rejected'); }
          else { await SahaayaDB.updateHomeStatus(btn.dataset.homeId, SAHAAYA_CONFIG.HOME_STATUS.REJECTED, 'Verification declined.'); }
          SahaayaUI.showToast('Home registration updated.', 'info');
          await loadData();
        } catch (err) { SahaayaUI.showToast('Error: ' + err.message, 'error'); }
      });
    });
  }

  function renderVolunteerDirectory() {
    const tbody = document.getElementById('volunteersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    allVolunteers.forEach(v => {
      const prof = v.profiles || {};
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + (prof.full_name || v.name || 'N/A') + '</strong><br><small style="color: var(--portal-muted);">Joined ' + new Date(prof.created_at || Date.now()).toLocaleDateString() + '</small></td>' +
        '<td>' + (prof.phone || v.phone || '—') + '<br><small style="color: var(--portal-muted);">' + (prof.email || v.email || '') + '</small></td>' +
        '<td><div style="display: flex; gap: 4px; flex-wrap: wrap;">' + ((v.interests || []).map(i => '<span class="cat-pill" style="font-size: 10px; padding: 2px 6px;">' + i + '</span>').join('') || 'General') + '</div></td>' +
        '<td><span style="font-size: 11px; color: var(--portal-muted);">' + ((v.availability || []).length) + ' active window(s)</span></td>' +
        '<td><strong style="color: var(--portal-primary); font-size: 14px;">' + parseFloat(v.total_hours || 0).toFixed(1) + ' hrs</strong></td>' +
        '<td>' + (v.completed_count || 0) + ' sessions</td>';
      tbody.appendChild(tr);
    });
  }

  function renderPipelineTable() {
    const tbody = document.getElementById('pipelineTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    allApplications.forEach(app => {
      const vol = (app.volunteers && app.volunteers.profiles) || {};
      const act = app._activity || app.activities || {};
      const home = app._home || act.old_age_homes || {};
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + (vol.full_name || 'Volunteer') + '</strong></td>' +
        '<td><strong>' + (act.title || 'Requirement') + '</strong><br><small style="color: var(--portal-muted);">' + (home.name || 'Home') + '</small></td>' +
        '<td><span class="match-pill match-high" style="font-size: 10px;">★ ' + (app.match_score || '—') + '%</span></td>' +
        '<td>' + SahaayaUI.getStatusBadge(app.status) + '</td>' +
        '<td><small>' + new Date(app.applied_at || Date.now()).toLocaleDateString() + '</small></td>' +
        '<td><small style="color: var(--portal-muted);">' + (app.coordinator_note || '—') + '</small></td>';
      tbody.appendChild(tr);
    });
  }

  function renderAllHomesTable() {
    const tbody = document.getElementById('allHomesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    allHomes.forEach(home => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + home.name + '</strong><br><small style="color: var(--portal-muted);">' + (home.city || home.area || '') + '</small></td>' +
        '<td><code>' + (home.registration_number || 'N/A') + '</code></td>' +
        '<td>' + ((home.profiles && home.profiles.full_name) || home.contact_person || 'N/A') + '</td>' +
        '<td>' + (home.resident_count || '—') + ' residents</td>' +
        '<td>' + SahaayaUI.getStatusBadge(home.verification_status) + '</td>' +
        '<td>' + (home.verification_status === 'pending'
          ? '<button class="btn-primary btn-sm quick-verify-btn" data-id="' + home.id + '">Verify Partner</button>'
          : '<span style="font-size: 12px; color: var(--portal-primary);">Active & Verified</span>') + '</td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.quick-verify-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          if (isSupabaseReady) { await SahaayaSupabaseDB.updateHomeVerification(btn.dataset.id, 'verified'); }
          else { await SahaayaDB.updateHomeStatus(btn.dataset.id, SAHAAYA_CONFIG.HOME_STATUS.VERIFIED); }
          SahaayaUI.showToast('Home verified successfully.', 'success');
          await loadData();
        } catch (err) { SahaayaUI.showToast('Error: ' + err.message, 'error'); }
      });
    });
  }

  await loadData();
});
