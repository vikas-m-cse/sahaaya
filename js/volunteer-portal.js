/**
 * SAHAAYA — Volunteer Portal Controller
 *
 * Depends on globals: SahaayaAuth, SahaayaDB, SahaayaMatching, SahaayaUI, SAHAAYA_CONFIG
 */

document.addEventListener("DOMContentLoaded", async () => {

  // -----------------------------------------------------------------------
  // 1. Auth Guard — must await the async check
  // -----------------------------------------------------------------------
  const session = await SahaayaAuth.checkAuthGuard("volunteer");
  if (!session) return;

  // -----------------------------------------------------------------------
  // 2. Populate Header
  // -----------------------------------------------------------------------
  const userAvatar       = document.getElementById("userAvatar");
  const userName         = document.getElementById("userName");
  const welcomeGreeting  = document.getElementById("welcomeGreeting");
  const logoutBtn        = document.getElementById("logoutBtn");

  if (userAvatar)      userAvatar.textContent     = session.avatar_initials || "VO";
  if (userName)        userName.textContent        = session.name;
  if (welcomeGreeting) welcomeGreeting.textContent = `Welcome back, ${session.name.split(" ")[0]} 👋`;

  if (logoutBtn) logoutBtn.addEventListener("click", () => SahaayaAuth.logout());

  document.getElementById("editProfileQuickBtn")?.addEventListener("click", openPreferencesModal);

  // -----------------------------------------------------------------------
  // 3. State
  // -----------------------------------------------------------------------
  let currentProfile        = null;
  let allOpportunities      = [];
  let userApplications      = [];
  let userAttendance        = [];
  let allHomes              = [];
  let selectedCategoryFilter = "all";
  let activeChatPoll = null;

  // -----------------------------------------------------------------------
  // 4. Tab Switching
  // -----------------------------------------------------------------------
  const tabButtons  = document.querySelectorAll(".portal-tab-btn");
  const tabContents = document.querySelectorAll(".portal-tab-content");

  function switchTab(tabId) {
    tabButtons.forEach(btn =>
      btn.classList.toggle("active", btn.dataset.tab === tabId)
    );
    tabContents.forEach(content =>
      content.classList.toggle("active", content.id === `tab-${tabId}`)
    );
  }

  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );

  // -----------------------------------------------------------------------
  // 5. Load All Data
  // -----------------------------------------------------------------------
  async function loadData() {
    currentProfile = await SahaayaDB.getVolunteerProfileByUserId(session.id);

    if (!currentProfile) {
      currentProfile = await SahaayaDB.updateVolunteerProfile(session.id, {
        bio: "Passionate community volunteer.",
        interests: ["companionship", "recreation"],
        availability: ["sun_morning", "sat_evening"]
      });
    }

    allHomes         = await SahaayaDB.getHomes();
    allOpportunities = await SahaayaDB.getOpportunities({ status: SAHAAYA_CONFIG.OPPORTUNITY_STATUS.OPEN });
    userApplications = await SahaayaDB.getApplications({ volunteer_id: session.id });
    userAttendance   = await SahaayaDB.getAttendanceHistoryByVolunteer(session.id);

    // Ensure opportunities linked to this volunteer's applications are available
    // (they may no longer be "open", so they were missing from allOpportunities)
    const knownIds = new Set(allOpportunities.map(o => o.id));
    const missingIds = [...new Set(
      userApplications
        .map(a => a.opportunity_id)
        .filter(id => id && !knownIds.has(id))
    )];
    if (missingIds.length) {
      const extras = await Promise.all(
        missingIds.map(id => SahaayaDB.getOpportunityById(id).catch(() => null))
      );
      extras.filter(Boolean).forEach(opp => allOpportunities.push(opp));
    }

    renderKPIs();
    renderOpportunities();
    renderHeroRecommendation();
    renderSchedule();
    renderApplicationsTable();
    renderAttendanceTable();
    renderProfileForm();

    // Resume the activity selected on the landing page after authentication.
    const requestedActivity = new URLSearchParams(window.location.search).get("activity");
    if (requestedActivity) {
      const requested = requestedActivity.trim().toLowerCase();
      const match = allOpportunities.find(opp =>
        (opp.title || "").toLowerCase().includes(requested) ||
        requested.includes((opp.title || "").toLowerCase())
      );
      if (match) {
        switchTab("discover");
        openApplyModal(match.id);
      } else {
        SahaayaUI.showToast("That activity is not currently open. Browse the available opportunities below.", "info");
        switchTab("discover");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Render KPI Cards
  // -----------------------------------------------------------------------
  function renderKPIs() {
    const totalHours    = currentProfile.total_hours    || 0;
    const completedCount = currentProfile.completed_count || 0;
    const upcomingCount  = userApplications.filter(a => a.status === "approved").length;
    const pendingCount   = userApplications.filter(a => a.status === "applied").length;

    document.getElementById("kpiTotalHours")?.textContent   && (document.getElementById("kpiTotalHours").textContent   = totalHours.toFixed(1));
    document.getElementById("kpiCompleted")?.textContent    && (document.getElementById("kpiCompleted").textContent    = completedCount);
    document.getElementById("kpiUpcoming")?.textContent     && (document.getElementById("kpiUpcoming").textContent     = upcomingCount);
    document.getElementById("kpiPendingApps")?.textContent  && (document.getElementById("kpiPendingApps").textContent  = pendingCount);

    setTextSafe("kpiTotalHours",   totalHours.toFixed(1));
    setTextSafe("kpiCompleted",    completedCount);
    setTextSafe("kpiUpcoming",     upcomingCount);
    setTextSafe("kpiPendingApps",  pendingCount);
    setTextSafe("countOpportunities", allOpportunities.length);
    setTextSafe("countSchedule",      upcomingCount);
    setTextSafe("countApplications",  userApplications.length);
    setTextSafe("countAttendance",    userAttendance.length);
  }

  function setTextSafe(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // -----------------------------------------------------------------------
  // 7. Render Opportunities with Transparent Matching
  // -----------------------------------------------------------------------
  function renderOpportunities() {
    const grid = document.getElementById("volunteerOppGrid");
    if (!grid) return;
    grid.innerHTML = "";

    let filtered = allOpportunities;
    if (selectedCategoryFilter !== "all") {
      filtered = allOpportunities.filter(o => o.category === selectedCategoryFilter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <h4>No volunteer requirements match this category</h4>
          <p>Try "All Requirements" or check back soon — homes publish new needs weekly.</p>
          <button class="btn-secondary" id="clearFilterBtn">Show All Requirements</button>
        </div>
      `;
      document.getElementById("clearFilterBtn")?.addEventListener("click", () => setCategoryFilter("all"));
      return;
    }

    const withScores = filtered.map(opp => {
      const match   = SahaayaMatching.calculateMatch(currentProfile, opp);
      const home    = allHomes.find(h => h.id === opp.home_id) || { name: "Community Senior Home", area: "Bengaluru" };
      const applied = userApplications.find(a =>
        a.opportunity_id === opp.id && (a.status === "applied" || a.status === "approved")
      );
      return { opp, match, home, applied };
    });

    withScores.sort((a, b) => b.match.score - a.match.score);
    setTextSafe("discoverLiveCount", filtered.length);

    withScores.forEach(({ opp, match, home, applied }, index) => {
      const spotsLeft = Math.max(0, (opp.spots_needed || 1) - (opp.spots_filled || 0));

      const card = document.createElement("article");
      const visualClass = opp.category === "music" ? "moment-music" : opp.category === "creative" ? "moment-creative" : opp.category === "outdoors" ? "moment-outdoors" : opp.category === "assistive" ? "moment-tech" : "moment-talk";
      card.className = "portal-card moment-card";
      card.innerHTML = `
        <div class="moment-visual ${visualClass}">
          <div class="moment-visual-top">
            <span class="moment-category">${SahaayaUI.getCategoryBadge(opp.category)}</span>
          </div>
          <span class="moment-visual-label">A MOMENT WORTH SHOWING UP FOR</span>
        </div>
        <div class="moment-body">
          <div class="moment-home">⌂ ${home.name} <span>· ${home.area}</span></div>
          <h3>${opp.title}</h3>
          <p>${opp.description}</p>
          <div class="moment-details">
            <span>◷ ${opp.date}</span>
            <span>⏱ ${opp.duration_hours} hrs</span>
            <span>⌖ ${home.area}</span>
          </div>
        </div>
        <div class="moment-footer">
          <span class="moment-spots"><i></i> ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} open</span>
          ${
            applied
              ? (applied.status === "approved"
                ? `<button class="btn-secondary btn-sm view-schedule-btn" data-opp-id="${opp.id}">View schedule & directions ↗</button>`
                : `<span class="badge badge-warning">Application in Review</span>`)
              : match.eligible
                ? `<button class="btn-primary apply-btn" data-opp-id="${opp.id}">I can show up <span>↗</span></button>`
                : `<span class="badge badge-warning" title="${(match.hardStops || []).join(" ")}">Cannot apply · ${(match.hardStops && match.hardStops[0]) || "Safety requirement"}</span>`
          }
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".apply-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        openApplyModal(btn.dataset.oppId);
      });
    });

    grid.querySelectorAll(".view-schedule-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchTab("schedule");
        const scheduleCard = document.querySelector(`.schedule-card[data-opp-id="${btn.dataset.oppId}"]`);
        scheduleCard?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  // -----------------------------------------------------------------------
  // 8. Category Filters
  // -----------------------------------------------------------------------
  function setCategoryFilter(category) {
    selectedCategoryFilter = category;
    document.querySelectorAll("#categoryFilterBar .filter").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === category);
    });
    renderOpportunities();
  }

  document.querySelectorAll("#categoryFilterBar .filter").forEach(btn => {
    btn.addEventListener("click", () => setCategoryFilter(btn.dataset.filter));
  });

  // -----------------------------------------------------------------------
  // 9. Apply Modal
  // -----------------------------------------------------------------------
  function openApplyModal(oppId) {
    const opp  = allOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    const home  = allHomes.find(h => h.id === opp.home_id) || { name: "Partner Senior Home", address: "Bengaluru" };
    const match = SahaayaMatching.calculateMatch(currentProfile, opp);
    if (!match.eligible) {
      SahaayaUI.showToast(match.hardStops[0] || "This activity cannot be applied to right now.", "warning");
      return;
    }

    SahaayaUI.openModal({
      title: "Confirm Volunteer Application",
      subtitle: `Requirement posted by ${home.name}`,
      bodyHtml: `
        <div style="background: #f7faf7; border: 1px solid #d5e6d8; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 6px; font-size: 16px; color: #174e43;">${opp.title}</h4>
          <p style="margin: 0; font-size: 13px; color: #52635f;">
            <strong>When:</strong> ${opp.date} (${opp.time_start} – ${opp.time_end})<br>
            <strong>Where:</strong> ${home.name}, ${home.address || "Bengaluru"}
          </p>
        </div>
        <div class="form-group">
          <label>A quick note to the coordinator (optional):</label>
          <textarea id="appNoteInput" rows="3" placeholder="Tell the coordinator what excites you about this activity..."></textarea>
          <span class="hint">The coordinator will review this alongside your verified profile.</span>
        </div>
      `,
      footerHtml: `
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn-primary" id="modalSubmitAppBtn">Submit Application →</button>
      `
    });

    document.getElementById("modalCancelBtn")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("modalSubmitAppBtn")?.addEventListener("click", async () => {
      const note = document.getElementById("appNoteInput")?.value.trim();
      try {
        await SahaayaDB.submitApplication({
          opportunity_id: opp.id,
          volunteer_id: session.id,
          volunteer_note: note || ""
        });
        SahaayaUI.closeModal();
        SahaayaUI.showToast("Application submitted! The old age home will review it.", "success");
        await loadData();
        switchTab("applications");
      } catch (err) {
        SahaayaUI.showToast(err.message, "warning");
      }
    });
  }

  // -----------------------------------------------------------------------
  // 7.5. Hero Recommendation — powered by the transparent matching engine
  // -----------------------------------------------------------------------
  function renderHeroRecommendation() {
    const matches = allOpportunities.map(opp => ({
      opp,
      match: SahaayaMatching.calculateMatch(currentProfile, opp),
      home: allHomes.find(h => h.id === opp.home_id) || { name: "Partner Senior Home", area: "Bengaluru" }
    })).sort((a,b) => b.match.score - a.match.score);

    const best = matches[0];
    setTextSafe("heroMatchCount", matches.length);
    if (!best) return;

    const { opp, match, home } = best;
    setTextSafe("heroOppTitle", opp.title || "A moment worth showing up for");
    setTextSafe("heroOppHome", (home.name || "Partner Senior Home") + " · " + (home.area || "Bengaluru"));
    setTextSafe("heroOppDescription", opp.description || "A meaningful activity with residents at a verified Sahaaya home.");
    setTextSafe("heroOppScore", match.score + "%");
    setTextSafe("heroOppTime", (opp.duration_hours || 1) + " hr" + (opp.duration_hours === 1 ? "" : "s") + " · " + (opp.date || "Upcoming"));
    setTextSafe("heroNextWindow", "Your next opening · " + (opp.date || "upcoming"));
    const fit = document.getElementById("heroFitLabel");
    if (fit) fit.textContent = "FEATURED ACTIVITY";
  }

  // -----------------------------------------------------------------------
  // 10. Render Schedule
  // -----------------------------------------------------------------------
  function renderSchedule() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;
    container.innerHTML = "";

    const approvedApps = userApplications.filter(a => a.status === "approved");

    if (approvedApps.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h4>No approved activities on your schedule yet</h4>
          <p>When an old age home approves your application, it will appear here with full venue and timing details.</p>
          <button class="btn-primary" id="scheduleExploreBtn">Browse Open Opportunities →</button>
        </div>
      `;
      document.getElementById("scheduleExploreBtn")?.addEventListener("click", () => switchTab("discover"));
      return;
    }

    const grid = document.createElement("div");
    grid.className = "portal-grid";

    approvedApps.forEach(app => {
      const opp  = allOpportunities.find(o => o.id === app.opportunity_id);
      const home = allHomes.find(h => h.id === opp?.home_id) || {
        name: "Senior Care Home",
        address: "Bengaluru",
        contact_person: "Coordinator",
        phone: "+91 80 0000 0000"
      };

      const card = document.createElement("article");
      card.className = "schedule-card portal-card";
      card.dataset.oppId = app.opportunity_id;
      card.innerHTML = `
        <div class="schedule-card-top">
          <div class="schedule-date-block">
            <span>YOUR NEXT MOMENT</span>
            <strong>${opp?.date || "Upcoming"}</strong>
          </div>
          <span class="schedule-status">✓ CONFIRMED</span>
        </div>
        <div class="schedule-card-main">
          <div class="schedule-time">${opp?.time_start || "Time TBC"} <span>— ${opp?.time_end || ""}</span></div>
          <h3>${opp?.title || "Community Activity"}</h3>
          <div class="schedule-home"><span>⌂</span><strong>${home.name}</strong><span class="schedule-dot">·</span><span>${home.address}</span></div>
          <div class="schedule-details">
            <div><small>DURATION</small><b>${opp?.duration_hours || 2} hrs</b></div>
            <div><small>COORDINATOR</small><b>${home.contact_person || "Home team"}</b></div>
            <div><small>CONTACT</small><b>${home.phone || "On file"}</b></div>
          </div>
          ${app.coordinator_note ? `<div class="schedule-note"><span>“</span><div><small>FROM YOUR COORDINATOR</small><p>${app.coordinator_note}</p></div></div>` : ""}
        </div>
        <div class="schedule-card-footer">
          <span><i></i> Check-in will be recorded by the home.</span>
          <button class="btn-secondary btn-sm directions-btn" data-address="${encodeURIComponent((home.name || "") + " " + (home.address || ""))}">View route ↗</button>
        </div>
      `;      grid.appendChild(card);
    });

    container.appendChild(grid);
    container.querySelectorAll(".directions-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${btn.dataset.address}`, "_blank");
      });
    });
  }

  // -----------------------------------------------------------------------
  // 11. Render Applications Table
  // -----------------------------------------------------------------------
  function renderApplicationsTable() {
    const tbody = document.getElementById("applicationsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (userApplications.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--portal-muted);">
            You haven't submitted any applications yet.
          </td>
        </tr>`;
      return;
    }

    userApplications.forEach(app => {
      const opp  = allOpportunities.find(o => o.id === app.opportunity_id);
      const home = allHomes.find(h => h.id === opp?.home_id) || { name: "Senior Care Home" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${opp?.title || "Community Requirement"}</strong><br>
          <small style="color: var(--portal-muted);">${home.name}</small>
        </td>
        <td>
          ${opp?.date || "—"}<br>
          <small style="color: var(--portal-muted);">${opp?.time_start || ""} – ${opp?.time_end || ""}</small>
        </td>
        <td>
          <span class="match-pill match-high" style="font-size: 10px;">★ ${app.match_score || "—"}%</span>
        </td>
        <td>${SahaayaUI.getStatusBadge(app.status)}</td>
        <td>
          <span style="font-size: 12px; color: ${app.coordinator_note ? "var(--portal-ink)" : "var(--portal-muted)"};">
            ${app.coordinator_note || "Awaiting coordinator review"}
          </span>
        </td>
        <td>
          <button class="btn-secondary btn-sm open-app-chat-btn" data-app-id="${app.id}">Chat</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".open-app-chat-btn").forEach(button => {
      button.addEventListener("click", () => {
        const app = userApplications.find(row => row.id === button.dataset.appId);
        if (app) openApplicationChatModal(app);
      });
    });
  }

  // -----------------------------------------------------------------------
  // Application chat
  // -----------------------------------------------------------------------
  async function openApplicationChatModal(app) {
    if (activeChatPoll) clearInterval(activeChatPoll);
    SahaayaUI.openModal({
      title: "Chat with the care home",
      subtitle: "Your conversation stays linked to this application.",
      bodyHtml: `
        <div class="chat-context" id="applicationChatContext"></div>
        <div class="chat-container">
          <div class="chat-messages" id="applicationChatMessages" aria-live="polite">
            <p class="chat-empty">Loading conversation…</p>
          </div>
        </div>
      `,
      footerHtml: `
        <div class="chat-input-bar">
          <textarea id="applicationChatInput" rows="2" maxlength="4000" placeholder="Write a message…" aria-label="Your message"></textarea>
          <button class="btn-primary" id="applicationChatSend">Send</button>
        </div>
      `
    });

    const context = document.getElementById("applicationChatContext");
    const addContext = (label, value) => {
      if (!value) return;
      const item = document.createElement("div");
      item.className = "chat-context-item";
      const heading = document.createElement("strong");
      heading.textContent = label;
      const body = document.createElement("p");
      body.textContent = value;
      item.append(heading, body);
      context.appendChild(item);
    };
    addContext("Your original application message", app.volunteer_note);
    addContext("Earlier reply from the coordinator", app.coordinator_note);

    const list = document.getElementById("applicationChatMessages");
    const renderMessages = messages => {
      list.replaceChildren();
      if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "chat-empty";
        empty.textContent = "No chat messages yet. Send a message to start the conversation.";
        list.appendChild(empty);
      }
      messages.forEach(message => {
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble " + (message.sender_id === session.id ? "chat-msg-outgoing" : "chat-msg-incoming");
        const meta = document.createElement("small");
        meta.className = "chat-message-meta";
        meta.textContent = (message.sender_id === session.id ? "You" : "Care home") + " · " + new Date(message.created_at).toLocaleString();
        const body = document.createElement("p");
        body.textContent = message.message;
        bubble.append(meta, body);
        list.appendChild(bubble);
      });
      list.scrollTop = list.scrollHeight;
    };

    const refresh = async (showError = false) => {
      try {
        const messages = await SahaayaDB.getApplicationMessages(app.id);
        if (document.getElementById("applicationChatMessages")) renderMessages(messages);
      } catch (error) {
        if (showError) SahaayaUI.showToast(error.message || "Could not load chat.", "error");
      }
    };
    await refresh(true);

    const input = document.getElementById("applicationChatInput");
    const send = document.getElementById("applicationChatSend");
    const sendMessage = async () => {
      const message = input.value.trim();
      if (!message || send.disabled) return;
      send.disabled = true;
      send.textContent = "Sending…";
      try {
        await SahaayaDB.sendApplicationMessage({
          applicationId: app.id,
          senderId: session.id,
          senderRole: "volunteer",
          message
        });
        input.value = "";
        await refresh(true);
      } catch (error) {
        SahaayaUI.showToast(error.message || "Could not send message.", "error");
      } finally {
        send.disabled = false;
        send.textContent = "Send";
      }
    };
    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    activeChatPoll = setInterval(() => {
      const modal = document.getElementById("sahaayaSharedModal");
      if (!modal || !modal.classList.contains("open") || !document.getElementById("applicationChatMessages")) {
        clearInterval(activeChatPoll);
        activeChatPoll = null;
        return;
      }
      refresh(false);
    }, 3500);
  }

  // -----------------------------------------------------------------------
  // 12. Render Attendance & Hours History
  // -----------------------------------------------------------------------
  function renderAttendanceTable() {
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (userAttendance.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--portal-muted);">
            No attendance records yet. Verified hours will appear here after you complete scheduled activities.
          </td>
        </tr>`;
      return;
    }

    userAttendance.forEach(record => {
      const home = allHomes.find(h => h.id === record.home_id) || { name: "Partner Senior Care" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${record.date}</strong></td>
        <td>${record.opportunity_title}</td>
        <td>${home.name}</td>
        <td><strong style="color: var(--portal-primary); font-size: 14px;">+${record.hours_credited} hrs</strong></td>
        <td>${SahaayaUI.getStatusBadge(record.status)}</td>
        <td>
          <button class="btn-secondary btn-sm feedback-btn"
            data-record-id="${record.id}" data-opp-id="${record.opportunity_id}">
            💬 Give Feedback
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".feedback-btn").forEach(btn => {
      btn.addEventListener("click", () => openFeedbackModal(btn.dataset.recordId, btn.dataset.oppId));
    });
  }

  // -----------------------------------------------------------------------
  // 13. Feedback Modal
  // -----------------------------------------------------------------------
  function openFeedbackModal(recordId, oppId) {
    SahaayaUI.openModal({
      title: "Share Activity Experience",
      subtitle: "Your feedback helps homes understand resident engagement and improve future sessions.",
      bodyHtml: `
        <div class="form-group">
          <label>Overall Experience Rating</label>
          <select id="fbRating">
            <option value="5">⭐⭐⭐⭐⭐ 5 — Truly Heartwarming & Meaningful</option>
            <option value="4">⭐⭐⭐⭐ 4 — Good & Pleasant</option>
            <option value="3">⭐⭐⭐ 3 — Average</option>
            <option value="2">⭐⭐ 2 — Could be improved</option>
            <option value="1">⭐ 1 — Needs attention</option>
          </select>
        </div>
        <div class="form-group">
          <label>Comments & Observations</label>
          <textarea id="fbComments" rows="3" placeholder="How did the residents respond? Any memorable moments or suggestions?"></textarea>
        </div>
      `,
      footerHtml: `
        <button class="btn-secondary" id="fbCancel">Close</button>
        <button class="btn-primary" id="fbSubmit">Submit Feedback</button>
      `
    });

    document.getElementById("fbCancel")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("fbSubmit")?.addEventListener("click", async () => {
      const rating   = parseInt(document.getElementById("fbRating").value, 10);
      const comments = document.getElementById("fbComments").value.trim();
      if (!comments) {
        SahaayaUI.showToast("Please enter your thoughts before submitting.", "warning");
        return;
      }
      await SahaayaDB.submitFeedback({
        opportunity_id: oppId,
        from_user_id: session.id,
        role_type: "volunteer_to_home",
        rating,
        comments
      });
      SahaayaUI.closeModal();
      SahaayaUI.showToast("Thank you! Your feedback has been recorded.", "success");
    });
  }

  // -----------------------------------------------------------------------
  // 14. Profile Form
  // -----------------------------------------------------------------------
  function openPreferencesModal() {
    const interests = currentProfile?.interests || [];
    const availability = currentProfile?.availability || [];

    SahaayaUI.openModal({
      title: "Your volunteering preferences",
      subtitle: "Choose the activities you enjoy and the times that work for you.",
      bodyHtml: `
        <div class="preference-modal-intro">
          <span class="preference-modal-icon">✦</span>
          <div><strong>Make Sahaaya feel like yours</strong><p>Your choices help us show more relevant volunteering opportunities.</p></div>
        </div>
        <div class="form-group">
          <label for="preferenceBio">A little about you <span class="hint">(optional)</span></label>
          <textarea id="preferenceBio" rows="3" placeholder="Tell care homes what motivates you to volunteer...">${escapeHtml(currentProfile?.bio || "")}</textarea>
        </div>
        <div class="form-group">
          <label>Activities you're interested in</label>
          <div class="preference-choice-grid" id="preferenceInterests">
            ${(SAHAAYA_CONFIG.CATEGORIES || []).map(cat => `
              <label class="preference-choice">
                <input type="checkbox" name="preferenceInterest" value="${escapeHtml(cat.id)}" ${interests.includes(cat.id) ? "checked" : ""}>
                <span>${cat.icon} ${escapeHtml(cat.label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="form-group">
          <label>When are you usually available?</label>
          <div class="preference-choice-grid" id="preferenceAvailability">
            ${(SAHAAYA_CONFIG.WEEKDAY_SLOTS || []).map(slot => `
              <label class="preference-choice">
                <input type="checkbox" name="preferenceAvailability" value="${escapeHtml(slot.id)}" ${availability.includes(slot.id) ? "checked" : ""}>
                <span>${escapeHtml(slot.label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <p class="preference-modal-note">You can change these preferences anytime. Your selections are used to personalise opportunity suggestions.</p>
      `,
      footerHtml: `
        <button class="btn-secondary" id="cancelPreferencesBtn" type="button">Cancel</button>
        <button class="btn-primary" id="savePreferencesBtn" type="button">Save preferences</button>
      `
    });

    document.getElementById("cancelPreferencesBtn")?.addEventListener("click", SahaayaUI.closeModal);
    document.getElementById("savePreferencesBtn")?.addEventListener("click", async () => {
      const saveButton = document.getElementById("savePreferencesBtn");
      if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Saving…"; }

      const updatedInterests = Array.from(document.querySelectorAll("input[name='preferenceInterest']:checked")).map(cb => cb.value);
      const updatedAvailability = Array.from(document.querySelectorAll("input[name='preferenceAvailability']:checked")).map(cb => cb.value);

      try {
        currentProfile = await SahaayaDB.updateVolunteerProfile(session.id, {
          bio: document.getElementById("preferenceBio")?.value.trim() || "",
          interests: updatedInterests,
          availability: updatedAvailability
        });
        SahaayaUI.closeModal();
        SahaayaUI.showToast("Your preferences have been saved.", "success");
        renderOpportunities();
      } catch (err) {
        if (saveButton) { saveButton.disabled = false; saveButton.textContent = "Save preferences"; }
        SahaayaUI.showToast(err.message || "Could not save your preferences. Please try again.", "warning");
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function renderProfileForm() {
    setInputSafe("profName",      session.name);
    setInputSafe("profEmail",     session.email);
    setInputSafe("profPhone",     session.phone || "+91 98450 12345");
    setInputSafe("profEmergency", currentProfile.emergency_contact || "");
    setInputSafe("profBio",       currentProfile.bio || "");

    const intContainer = document.getElementById("interestsCheckboxes");
    if (intContainer) {
      intContainer.innerHTML = SAHAAYA_CONFIG.CATEGORIES.map(cat => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer;">
          <input type="checkbox" name="interest" value="${cat.id}" ${(currentProfile.interests || []).includes(cat.id) ? "checked" : ""}>
          <span>${cat.icon} ${cat.label}</span>
        </label>
      `).join("");
    }

    const availContainer = document.getElementById("availabilityCheckboxes");
    if (availContainer) {
      availContainer.innerHTML = SAHAAYA_CONFIG.WEEKDAY_SLOTS.map(slot => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer;">
          <input type="checkbox" name="availability" value="${slot.id}" ${(currentProfile.availability || []).includes(slot.id) ? "checked" : ""}>
          <span>${slot.label}</span>
        </label>
      `).join("");
    }

    // Save handler is registered once below, not during rendering.
  }

  // Register the profile save handler once, before the first data load.
  // Phone and emergency contact are optional; they must not silently block form submission.
  const profileForm = document.getElementById("volunteerProfileForm");
  const profilePhoneInput = document.getElementById("profPhone");
  const emergencyInput = document.getElementById("profEmergency");
  if (profilePhoneInput) profilePhoneInput.required = false;
  if (emergencyInput) emergencyInput.required = false;

  profileForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const saveButton = profileForm.querySelector('button[type="submit"]');
    if (saveButton?.disabled) return;

    const updatedName = document.getElementById("profName")?.value.trim() || "";
    const updatedPhone = profilePhoneInput?.value.trim() || "";
    if (!updatedName) {
      SahaayaUI.showToast("Please enter your full name.", "warning");
      document.getElementById("profName")?.focus();
      return;
    }

    const originalButtonText = saveButton?.textContent;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
    }

    try {
      currentProfile = await SahaayaDB.updateVolunteerProfile(session.id, {
        full_name: updatedName,
        phone: updatedPhone,
        bio: document.getElementById("profBio")?.value.trim() || "",
        emergency_contact: emergencyInput?.value.trim() || "",
        interests: Array.from(document.querySelectorAll("input[name='interest']:checked")).map(cb => cb.value),
        availability: Array.from(document.querySelectorAll("input[name='availability']:checked")).map(cb => cb.value)
      });

      session.name = updatedName;
      session.phone = updatedPhone;
      if (userName) userName.textContent = updatedName;
      if (userAvatar) userAvatar.textContent = updatedName.split(/\\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
      if (welcomeGreeting) welcomeGreeting.textContent = `Welcome back, ${updatedName.split(" ")[0]} 👋`;

      SahaayaUI.showToast("Profile updated successfully.", "success");
      renderOpportunities();
    } catch (err) {
      console.error("Sahaaya profile save failed:", err);
      SahaayaUI.showToast(err?.message || "Could not save your profile. Please try again.", "warning");
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText || "Save Profile Preferences";
      }
    }
  });

  function setInputSafe(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  // Print
  document.getElementById("downloadCertBtn")?.addEventListener("click", () => window.print());

  // -----------------------------------------------------------------------
  // 15. Initial Load
  // -----------------------------------------------------------------------
  await loadData();
});
