/**
 * SAHAAYA — Old Age Home Portal Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate Guard
  const session = await SahaayaAuth.checkAuthGuard("home");
  if (!session) return;

  // DOM References
  const homeAvatar = document.getElementById("homeAvatar");
  const homeCoordinatorName = document.getElementById("homeCoordinatorName");
  const homeNameTag = document.getElementById("homeNameTag");
  const homeWelcomeTitle = document.getElementById("homeWelcomeTitle");
  const logoutBtn = document.getElementById("logoutBtn");
  const verificationNoticeArea = document.getElementById("verificationNoticeArea");

  logoutBtn.addEventListener("click", () => SahaayaAuth.logout());

  // State
  let currentHome = null;
  let homeOpportunities = [];
  let homeApplications = [];
  let allUsers = [];

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
    allUsers = await SahaayaDB.getUsers();

    // Find home linked to session or fallback to home_01
    const homeId = session.home_id || "home_01";
    currentHome = await SahaayaDB.getHomeById(homeId);

    if (!currentHome) {
      // Fallback
      const homes = await SahaayaDB.getHomes();
      currentHome = homes[0];
    }

    // Populate Topbar & Greetings
    homeAvatar.textContent = currentHome.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    homeCoordinatorName.textContent = session.name;
    homeNameTag.textContent = `${currentHome.name} · ${currentHome.area}`;
    homeWelcomeTitle.textContent = `${currentHome.name} 🏡`;

    // Render Verification Notice Banner
    renderVerificationBanner();

    // Fetch requirements & applications for this home
    const allOpps = await SahaayaDB.getOpportunities();
    homeOpportunities = allOpps.filter(o => o.home_id === currentHome.id);

    const allApps = await SahaayaDB.getApplications();
    const homeOppIds = new Set(homeOpportunities.map(o => o.id));
    homeApplications = allApps.filter(a => homeOppIds.has(a.opportunity_id));

    renderKPIs();
    renderApplications();
    renderRequirements();
    renderAttendanceRoster();
    renderProfileForm();
  }

  // 3. Render Verification Banner
  function renderVerificationBanner() {
    if (currentHome.verification_status === SAHAAYA_CONFIG.HOME_STATUS.PENDING) {
      verificationNoticeArea.innerHTML = `
        <div class="portal-notice notice-warning">
          <div class="notice-content">
            <span class="notice-icon">⏳</span>
            <div>
              <strong>Home Verification In Progress:</strong>
              Your registration documents are being verified by Sahaaya Platform Administrators. You can configure requirements, and they will become publicly discoverable once approved.
            </div>
          </div>
          <span class="badge badge-warning">Verification Pending</span>
        </div>
      `;
    } else if (currentHome.verification_status === SAHAAYA_CONFIG.HOME_STATUS.VERIFIED) {
      verificationNoticeArea.innerHTML = `
        <div class="portal-notice notice-success">
          <div class="notice-content">
            <span class="notice-icon">✓</span>
            <div>
              <strong>Verified Partner Home:</strong>
              Registered NGO/Trust (${currentHome.registration_number}). Your volunteer requirements are actively recommended to verified volunteers.
            </div>
          </div>
          <span class="badge badge-success">✓ Verified Partner</span>
        </div>
      `;
    }
  }

  // 4. Render KPIs
  function renderKPIs() {
    const pendingReviews = homeApplications.filter(a => a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.APPLIED).length;
    const approvedVolunteers = homeApplications.filter(a => a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.APPROVED || a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.ATTENDED).length;

    document.getElementById("kpiActiveRequirements").textContent = homeOpportunities.length;
    document.getElementById("kpiPendingReviews").textContent = pendingReviews;
    document.getElementById("kpiApprovedVolunteers").textContent = approvedVolunteers;
    document.getElementById("kpiResidentCount").textContent = currentHome.resident_count || 40;

    document.getElementById("countPendingReview").textContent = pendingReviews;
    document.getElementById("countRequirements").textContent = homeOpportunities.length;
  }

  // 5. Render Applications to Review
  function renderApplications() {
    const container = document.getElementById("applicationsContainer");
    container.innerHTML = "";

    const pendingApps = homeApplications.filter(a => a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.APPLIED);

    if (pendingApps.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💌</div>
          <h4>No pending applications to review</h4>
          <p>You have reviewed all incoming applications. When volunteers discover your requirements and apply, their profiles will appear here for your approval.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "portal-grid";

    pendingApps.forEach(app => {
      const opp = homeOpportunities.find(o => o.id === app.opportunity_id);
      const volunteer = allUsers.find(u => u.id === app.volunteer_id) || { name: "Volunteer Applicant", email: "", phone: "" };

      const card = document.createElement("div");
      card.className = "portal-card";
      card.innerHTML = `
        <div class="portal-card-header">
          <span class="badge badge-warning">Under Review</span>
          <span class="match-pill match-high">★ ${app.match_score}% Fit</span>
        </div>
        <div class="portal-card-body">
          <div style="font-size: 11px; font-weight: 700; color: var(--portal-muted); margin-bottom: 6px;">
            ACTIVITY: ${opp?.title || "Volunteer Requirement"}
          </div>
          <h3 style="margin-bottom: 4px;">${volunteer.name}</h3>
          <div style="font-size: 12px; color: var(--portal-muted); margin-bottom: 14px;">
            📞 ${volunteer.phone || "Phone on file"} · ✉ ${volunteer.email}
          </div>

          <div style="background: #f7faf7; border-radius: 12px; padding: 14px; margin-bottom: 14px;">
            <strong style="display: block; font-size: 12px; color: var(--portal-deep); margin-bottom: 6px;">
              Volunteer's Application Message:
            </strong>
            <p style="margin: 0; font-size: 13px; font-style: italic; color: #2e443f;">
              "${app.volunteer_note || "Willing and excited to participate!"}"
            </p>
          </div>

          <div class="match-explainer-box">
            <strong>Compatibility Breakdown:</strong>
            <ul>
              ${(app.match_reasons || ["Direct category interest"]).map(r => `<li>${r}</li>`).join("")}
            </ul>
          </div>
        </div>
        <div class="portal-card-footer">
          <button class="btn-danger btn-sm decline-btn" data-app-id="${app.id}">
            Decline
          </button>
          <button class="btn-primary btn-sm approve-btn" data-app-id="${app.id}" data-volunteer="${volunteer.name}">
            Approve Volunteer ✓
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    container.appendChild(grid);

    // Event listeners
    grid.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", () => openApproveModal(btn.dataset.appId, btn.dataset.volunteer));
    });

    grid.querySelectorAll(".decline-btn").forEach(btn => {
      btn.addEventListener("click", () => openDeclineModal(btn.dataset.appId));
    });
  }

  // Approve Modal
  function openApproveModal(appId, volunteerName) {
    SahaayaUI.openModal({
      title: `Approve ${volunteerName}`,
      subtitle: "The activity will be automatically added to the volunteer's schedule.",
      bodyHtml: `
        <div class="form-group">
          <label>Welcome Note / Instructions for the volunteer (Optional):</label>
          <textarea id="approveNoteInput" rows="3" placeholder="e.g. Welcome! Please report to Reception Desk at 10:45 AM. Looking forward to having you."></textarea>
        </div>
      `,
      footerHtml: `
        <button class="btn-secondary" id="approveCancel">Cancel</button>
        <button class="btn-primary" id="approveConfirm">Confirm Approval ✓</button>
      `
    });

    document.getElementById("approveCancel")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("approveConfirm")?.addEventListener("click", async () => {
      const note = document.getElementById("approveNoteInput").value.trim();
      await SahaayaDB.updateApplicationStatus(appId, SAHAAYA_CONFIG.APPLICATION_STATUS.APPROVED, note || "Application approved! See you soon.");
      SahaayaUI.closeModal();
      SahaayaUI.showToast(`Approved ${volunteerName}! Added to their schedule.`, "success");
      await loadData();
    });
  }

  // Decline Modal
  function openDeclineModal(appId) {
    SahaayaUI.openModal({
      title: "Decline Volunteer Application",
      subtitle: "Provide a gentle note explaining why this specific requirement is not suitable at this time.",
      bodyHtml: `
        <div class="form-group">
          <label>Reason for declining:</label>
          <select id="declineReasonSelect">
            <option value="Spots for this session are currently full.">Spots for this session are currently full.</option>
            <option value="Activity requires specialized medical or language training.">Activity requires specialized training.</option>
            <option value="Schedule rescheduled or postponed by home.">Schedule postponed by the home.</option>
          </select>
        </div>
      `,
      footerHtml: `
        <button class="btn-secondary" id="declineCancel">Cancel</button>
        <button class="btn-danger" id="declineConfirm">Confirm Decline</button>
      `
    });

    document.getElementById("declineCancel")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("declineConfirm")?.addEventListener("click", async () => {
      const reason = document.getElementById("declineReasonSelect").value;
      await SahaayaDB.updateApplicationStatus(appId, SAHAAYA_CONFIG.APPLICATION_STATUS.REJECTED, reason);
      SahaayaUI.closeModal();
      SahaayaUI.showToast("Application updated.", "info");
      await loadData();
    });
  }

  // 6. Render Requirements & Activities
  function renderRequirements() {
    const grid = document.getElementById("homeRequirementsGrid");
    grid.innerHTML = "";

    if (homeOpportunities.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📌</div>
          <h4>No volunteer requirements posted yet</h4>
          <p>As an Old Age Home, you define what assistance your residents need. Click the button above to publish your first requirement.</p>
        </div>
      `;
      return;
    }

    homeOpportunities.forEach(opp => {
      const card = document.createElement("div");
      card.className = "portal-card";

      const spotsLeft = Math.max(0, (opp.spots_needed || 1) - (opp.spots_filled || 0));

      card.innerHTML = `
        <div class="portal-card-header">
          ${SahaayaUI.getCategoryBadge(opp.category)}
          ${SahaayaUI.getStatusBadge(opp.status)}
        </div>
        <div class="portal-card-body">
          <h3>${opp.title}</h3>
          <p>${opp.description}</p>

          <div style="background: #f8faf7; border-radius: 10px; padding: 12px; font-size: 12px; margin-bottom: 12px;">
            <div><strong>🗓 Date:</strong> ${opp.date}</div>
            <div><strong>⏰ Time:</strong> ${opp.time_start} – ${opp.time_end} (${opp.duration_hours} hrs)</div>
            <div><strong>👥 Volunteers Needed:</strong> ${opp.spots_needed} (${opp.spots_filled || 0} approved)</div>
          </div>

          <div style="font-size: 12px; color: var(--portal-muted);">
            <strong>Skills Requested:</strong> ${(opp.required_skills || []).join(", ") || "General empathy & patience"}
          </div>
        </div>
        <div class="portal-card-footer">
          <span style="font-size: 12px; font-weight: 700; color: ${spotsLeft === 0 ? '#991b1b' : 'var(--portal-primary)'};">
            ${spotsLeft === 0 ? "All spots filled" : `${spotsLeft} spots remaining`}
          </span>
          <button class="btn-secondary btn-sm edit-opp-btn" data-opp-id="${opp.id}">
            Edit Need
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".edit-opp-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        SahaayaUI.showToast("Requirement is live and receiving applications.", "info");
      });
    });
  }

  // 7. Create New Requirement Modal
  document.getElementById("openCreateRequirementModalBtn").addEventListener("click", () => {
    SahaayaUI.openModal({
      title: "Define New Volunteer Requirement",
      subtitle: "The Old Age Home decides what help it needs. Sahaaya helps coordinate volunteers.",
      bodyHtml: `
        <form id="createRequirementForm">
          <div class="form-group">
            <label>Requirement Title</label>
            <input type="text" id="newReqTitle" required placeholder="e.g. Sunday Storytelling & Carrom Afternoon">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Activity Category</label>
              <select id="newReqCategory" required>
                ${SAHAAYA_CONFIG.CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Availability Time Window</label>
              <select id="newReqSlot" required>
                ${SAHAAYA_CONFIG.WEEKDAY_SLOTS.map(s => `<option value="${s.id}">${s.label}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Specific Resident Need & Description (Detailed instructions)</label>
            <textarea id="newReqDesc" rows="3" required placeholder="Describe what residents would enjoy, any precautions, and how volunteers can help..."></textarea>
            <span class="hint">Be specific so volunteers with the right temperament and interests apply.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="newReqDate" required value="${new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label>Number of Volunteers Needed</label>
              <input type="number" id="newReqSpots" min="1" max="15" value="3" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Start Time</label>
              <input type="text" id="newReqStart" value="11:00 AM" required>
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input type="text" id="newReqEnd" value="01:00 PM" required>
            </div>
          </div>

          <div class="form-group">
            <label>Requested Skills (Comma-separated)</label>
            <input type="text" id="newReqSkills" placeholder="e.g. Patience, Board games, Storytelling, Hindi/Kannada speaker">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn-secondary" id="cancelReqBtn">Cancel</button>
        <button class="btn-primary" id="saveReqBtn">Publish Volunteer Requirement →</button>
      `
    });

    document.getElementById("cancelReqBtn")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("saveReqBtn")?.addEventListener("click", async () => {
      const form = document.getElementById("createRequirementForm");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const title = document.getElementById("newReqTitle").value.trim();
      const category = document.getElementById("newReqCategory").value;
      const slot_id = document.getElementById("newReqSlot").value;
      const description = document.getElementById("newReqDesc").value.trim();
      const date = document.getElementById("newReqDate").value;
      const spots_needed = parseInt(document.getElementById("newReqSpots").value, 10);
      const time_start = document.getElementById("newReqStart").value.trim();
      const time_end = document.getElementById("newReqEnd").value.trim();
      const skillsRaw = document.getElementById("newReqSkills").value;
      const required_skills = skillsRaw ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean) : ["Patience", "Empathy"];

      await SahaayaDB.createOpportunity({
        home_id: currentHome.id,
        title,
        category,
        slot_id,
        description,
        date,
        time_start,
        time_end,
        duration_hours: 2.0,
        spots_needed,
        required_skills
      });

      SahaayaUI.closeModal();
      SahaayaUI.showToast("Requirement published successfully! It is now open to volunteers.", "success");
      await loadData();
      switchTab("requirements");
    });
  });

  // 8. Render Attendance & Hours Sheet
  function renderAttendanceRoster() {
    const tbody = document.getElementById("attendanceRosterBody");
    tbody.innerHTML = "";

    const approvedApps = homeApplications.filter(a => a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.APPROVED || a.status === SAHAAYA_CONFIG.APPLICATION_STATUS.ATTENDED);

    if (approvedApps.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--portal-muted);">
            No volunteers approved yet. Once you approve volunteer applications, they will appear on this attendance roster.
          </td>
        </tr>
      `;
      return;
    }

    approvedApps.forEach(app => {
      const opp = homeOpportunities.find(o => o.id === app.opportunity_id);
      const volunteer = allUsers.find(u => u.id === app.volunteer_id) || { name: "Volunteer", phone: "" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${volunteer.name}</strong><br>
          <small style="color: var(--portal-muted);">${volunteer.phone}</small>
        </td>
        <td>${opp?.title || "Activity"}</td>
        <td>
          ${opp?.date || "—"}<br>
          <small style="color: var(--portal-muted);">${opp?.time_start} – ${opp?.time_end}</small>
        </td>
        <td><strong>+${opp?.duration_hours || 2.0} hrs</strong></td>
        <td>${SahaayaUI.getStatusBadge(app.status)}</td>
        <td>
          ${
            app.status === SAHAAYA_CONFIG.APPLICATION_STATUS.ATTENDED
              ? `<span style="color: var(--portal-primary); font-size: 12px; font-weight: 700;">✓ Hours Credited</span>`
              : `<button class="btn-primary btn-sm mark-present-btn" data-app-id="${app.id}" data-volunteer="${volunteer.name}" data-hours="${opp?.duration_hours || 2.0}">
                   Mark Present ✓
                 </button>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".mark-present-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const appId = btn.dataset.appId;
        const volName = btn.dataset.volunteer;
        const hours = btn.dataset.hours;

        await SahaayaDB.recordAttendance({
          applicationId: appId,
          status: "present",
          markedByUserId: session.id
        });

        SahaayaUI.showToast(`Attendance verified! ${hours} hours credited to ${volName}.`, "success");
        await loadData();
      });
    });
  }

  // 9. Profile Form
  function renderProfileForm() {
    document.getElementById("profHomeName").value = currentHome.name;
    document.getElementById("profRegNo").value = currentHome.registration_number;
    document.getElementById("profResidentCount").value = currentHome.resident_count;
    document.getElementById("profContactPerson").value = currentHome.contact_person;
    document.getElementById("profArea").value = currentHome.area;
    document.getElementById("profAddress").value = currentHome.address;
    document.getElementById("profDescription").value = currentHome.description || "";

    const badgePlaceholder = document.getElementById("verificationBadgePlaceholder");
    badgePlaceholder.innerHTML = SahaayaUI.getStatusBadge(currentHome.verification_status);

    document.getElementById("homeProfileForm").addEventListener("submit", async e => {
      e.preventDefault();
      currentHome.name = document.getElementById("profHomeName").value.trim();
      currentHome.resident_count = parseInt(document.getElementById("profResidentCount").value, 10);
      currentHome.contact_person = document.getElementById("profContactPerson").value.trim();
      currentHome.area = document.getElementById("profArea").value.trim();
      currentHome.address = document.getElementById("profAddress").value.trim();
      currentHome.description = document.getElementById("profDescription").value.trim();

      // Save via update
      const homes = await SahaayaDB.getHomes();
      const idx = homes.findIndex(h => h.id === currentHome.id);
      if (idx !== -1) {
        homes[idx] = currentHome;
        localStorage.setItem(SAHAAYA_CONFIG.STORAGE_KEY_PREFIX + "homes", JSON.stringify(homes));
      }

      SahaayaUI.showToast("Home profile details updated successfully.", "success");
      loadData();
    });
  }

  // Initial Load
  await loadData();
});
