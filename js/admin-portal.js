/**
 * SAHAAYA — Platform Admin Portal Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate Guard
  const session = await SahaayaAuth.checkAuthGuard("admin");
  if (!session) return;

  // DOM References
  const logoutBtn = document.getElementById("logoutBtn");
  const exportReportBtn = document.getElementById("exportReportBtn");

  logoutBtn.addEventListener("click", () => SahaayaAuth.logout());
  exportReportBtn.addEventListener("click", () => window.print());

  // State
  let allHomes = [];
  let allUsers = [];
  let allVolunteers = [];
  let allProfiles = [];
  let allOpportunities = [];
  let allApplications = [];
  let allAttendance = [];

  // Tab Switching
  const tabButtons = document.querySelectorAll(".portal-tab-btn");
  const tabContents = document.querySelectorAll(".portal-tab-content");

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
      content.classList.toggle("active", content.id === `tab-${tabId}`);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // 2. Fetch Initial Data
  async function loadData() {
    allHomes = await SahaayaDB.getHomes();
    allUsers = await SahaayaDB.getUsers();
    allVolunteers = allUsers.filter(u => u.role === "volunteer");
    allOpportunities = await SahaayaDB.getOpportunities();
    allApplications = await SahaayaDB.getApplications();

    // Fetch profiles for volunteers
    allProfiles = [];
    for (const v of allVolunteers) {
      const p = await SahaayaDB.getVolunteerProfileByUserId(v.id);
      if (p) allProfiles.push(p);
    }

    renderKPIs();
    renderVerificationQueue();
    renderVolunteerDirectory();
    renderPipelineTable();
    renderAllHomesTable();
  }

  // 3. Render KPIs
  function renderKPIs() {
    const pendingHomes = allHomes.filter(h => h.verification_status === SAHAAYA_CONFIG.HOME_STATUS.PENDING);
    const totalHours = allProfiles.reduce((sum, p) => sum + (parseFloat(p.total_hours) || 0), 0);

    document.getElementById("kpiPlatformHours").textContent = totalHours.toFixed(1);
    document.getElementById("kpiHomesCount").textContent = allHomes.length;
    document.getElementById("kpiVolunteersCount").textContent = allVolunteers.length;
    document.getElementById("kpiPendingVerification").textContent = pendingHomes.length;

    document.getElementById("countPendingQueue").textContent = pendingHomes.length;
  }

  // 4. Render Verification Queue
  function renderVerificationQueue() {
    const container = document.getElementById("verificationQueueContainer");
    container.innerHTML = "";

    const pendingHomes = allHomes.filter(h => h.verification_status === SAHAAYA_CONFIG.HOME_STATUS.PENDING);

    if (pendingHomes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <h4>All registered senior homes are verified</h4>
          <p>No new applications in the verification queue. Any newly registered old age homes will appear here for administrative vetting.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "portal-grid";

    pendingHomes.forEach(home => {
      const card = document.createElement("article");
      card.className = "portal-card admin-verify-card";
      card.innerHTML = `
        <div class="portal-card-header">
          <div>
            <span class="badge badge-warning">VERIFICATION REQUIRED</span>
            <div class="admin-verify-meta">REGISTRATION · ${home.registration_number || "Pending record"}</div>
          </div>
          <span class="admin-verify-meta">NEW PARTNER REQUEST</span>
        </div>
        <div class="portal-card-body">
          <div class="admin-verify-body">
            <div>
              <span class="admin-eyebrow">PARTNER HOME</span>
              <h3>${home.name}</h3>
              <div style="font-size:10px;color:var(--portal-muted);line-height:1.55;">
                <strong>${home.area || "Bengaluru"}</strong><br>
                ${home.address || "Address on registration"}<br>
                Superintendent · <strong>${home.contact_person || "Not provided"}</strong>
              </div>
              <div class="admin-verify-facts">
                <div class="admin-verify-fact"><small>RESIDENTS</small><strong>${home.resident_count || 0}</strong></div>
                <div class="admin-verify-fact"><small>REGISTRATION</small><strong>${home.registration_number || "—"}</strong></div>
              </div>
            </div>
            <div class="admin-verify-note">
              <small>VETTING CONTEXT</small>
              <p><strong>About:</strong> ${home.description || "Senior living and assisted care."}</p>
              <p style="margin-top:9px;"><strong>Verification note:</strong> ${home.verification_notes || "Certificate inspection pending."}</p>
            </div>
          </div>
        </div>
        <div class="portal-card-footer admin-verify-actions">
          <button class="btn-danger btn-sm decline-home-btn" data-home-id="${home.id}">Decline</button>
          <button class="btn-primary btn-sm verify-home-btn" data-home-id="${home.id}" data-name="${home.name}">Approve & Verify Partner ✓</button>
        </div>
      `;      grid.appendChild(card);
    });

    container.appendChild(grid);

    grid.querySelectorAll(".verify-home-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const homeId = btn.dataset.homeId;
        const name = btn.dataset.name;

        await SahaayaDB.updateHomeStatus(homeId, SAHAAYA_CONFIG.HOME_STATUS.VERIFIED, "Verified by platform admin. Registration documents confirmed.");
        SahaayaUI.showToast(`Verified ${name}! Home is now eligible to publish volunteer requirements.`, "success");
        await loadData();
      });
    });

    grid.querySelectorAll(".decline-home-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const homeId = btn.dataset.homeId;
        await SahaayaDB.updateHomeStatus(homeId, SAHAAYA_CONFIG.HOME_STATUS.REJECTED, "Registration verification declined. Missing non-profit credentials.");
        SahaayaUI.showToast("Home registration updated.", "info");
        await loadData();
      });
    });
  }

  // 5. Render Volunteer Directory
  function renderVolunteerDirectory() {
    const tbody = document.getElementById("volunteersTableBody");
    tbody.innerHTML = "";

    allVolunteers.forEach(v => {
      const profile = allProfiles.find(p => p.user_id === v.id) || { total_hours: 0, completed_count: 0, interests: [], availability: [] };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${v.name}</strong><br>
          <small style="color: var(--portal-muted);">Joined ${new Date(v.created_at).toLocaleDateString()}</small>
        </td>
        <td>
          ${v.phone}<br>
          <small style="color: var(--portal-muted);">${v.email}</small>
        </td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${(profile.interests || []).map(i => `<span class="cat-pill" style="font-size: 10px; padding: 2px 6px;">${i}</span>`).join("") || "General"}
          </div>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--portal-muted);">
            ${(profile.availability || []).length} active window(s)
          </span>
        </td>
        <td><strong style="color: var(--portal-primary); font-size: 14px;">${(profile.total_hours || 0).toFixed(1)} hrs</strong></td>
        <td>${profile.completed_count || 0} sessions</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 6. Render Application Pipeline
  function renderPipelineTable() {
    const tbody = document.getElementById("pipelineTableBody");
    tbody.innerHTML = "";

    allApplications.forEach(app => {
      const volunteer = allUsers.find(u => u.id === app.volunteer_id) || { name: "Volunteer" };
      const opp = allOpportunities.find(o => o.id === app.opportunity_id);
      const home = allHomes.find(h => h.id === opp?.home_id) || { name: "Senior Care Home" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${volunteer.name}</strong></td>
        <td>
          <strong>${opp?.title || "Requirement"}</strong><br>
          <small style="color: var(--portal-muted);">${home.name}</small>
        </td>
        <td>
          <span class="match-pill match-high" style="font-size: 10px;">★ ${app.match_score}%</span>
        </td>
        <td>${SahaayaUI.getStatusBadge(app.status)}</td>
        <td><small>${new Date(app.applied_at).toLocaleDateString()}</small></td>
        <td><small style="color: var(--portal-muted);">${app.coordinator_note || "—"}</small></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 7. Render All Homes Table
  function renderAllHomesTable() {
    const tbody = document.getElementById("allHomesTableBody");
    tbody.innerHTML = "";

    allHomes.forEach(home => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${home.name}</strong><br>
          <small style="color: var(--portal-muted);">${home.area}</small>
        </td>
        <td><code>${home.registration_number}</code></td>
        <td>${home.contact_person}</td>
        <td>${home.resident_count} residents</td>
        <td>${SahaayaUI.getStatusBadge(home.verification_status)}</td>
        <td>
          ${
            home.verification_status === "pending"
              ? `<button class="btn-primary btn-sm quick-verify-btn" data-id="${home.id}">Verify Partner</button>`
              : `<span style="font-size: 12px; color: var(--portal-primary);">Active & Verified</span>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".quick-verify-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await SahaayaDB.updateHomeStatus(btn.dataset.id, SAHAAYA_CONFIG.HOME_STATUS.VERIFIED);
        SahaayaUI.showToast("Home verified successfully.", "success");
        await loadData();
      });
    });
  }

  // Initial Load
  await loadData();
});
