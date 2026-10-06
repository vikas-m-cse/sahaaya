/**
 * SAHAAYA — Public Landing Page Controller
 *
 * Plain script (no ES module syntax).
 * Depends on globals: SahaayaAuth, SahaayaDB, SahaayaUI, SAHAAYA_CONFIG
 */

// -------------------------------------------------------------------------
// Landing page modal (the original simple modal, kept for landing page)
// -------------------------------------------------------------------------
const legacyModal   = document.getElementById("modal");
const legacyContent = document.getElementById("modalContent");

function showLandingToast(msg, type) {
  if (window.SahaayaUI) {
    SahaayaUI.showToast(msg, type || "info");
  } else {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2600);
    }
  }
}

function openLandingModal(type, activity) {
  let html = "";

  if (type === "join") {
    html = `
      <div class="eyebrow">BECOME A VOLUNTEER</div>
      <h2>Let's find your fit.</h2>
      <p>Create your verified volunteer profile to start discovering opportunities at partner senior homes.</p>
      <form class="form" id="joinForm">
        <input required id="joinName" placeholder="Your full name" value="Ananya Sharma">
        <input required id="joinEmail" type="email" placeholder="Email address" value="">
        <input required id="joinPassword" type="password" placeholder="Password (min 6 characters)" minlength="6">
        <input id="joinPhone" placeholder="Phone number" value="+91 98450 12345">
        <select id="joinInterest">
          <option value="companionship">Companionship &amp; Storytelling</option>
          <option value="recreation">Recreation &amp; Board Games</option>
          <option value="music">Music &amp; Cultural</option>
          <option value="assistive">Digital &amp; Smartphone Help</option>
          <option value="creative">Creative &amp; Arts</option>
          <option value="outdoors">Outdoors &amp; Gentle Walks</option>
        </select>
        <select id="joinAvailability">
          <option value="sun_morning">Sunday Morning (9:00 AM – 1:00 PM)</option>
          <option value="sat_evening">Saturday Evening (4:00 PM – 7:00 PM)</option>
          <option value="sat_morning">Saturday Morning (9:00 AM – 1:00 PM)</option>
          <option value="weekday_evening">Weekday Evenings (5:00 PM – 8:00 PM)</option>
        </select>
        <button class="btn primary" type="submit" id="joinSubmitBtn">Create Volunteer Account →</button>
        <p style="font-size: 12px; text-align: center; margin: 4px 0 0; color: #687873;">
          Already have an account? <a href="#" id="switchToLogin" style="color: #286c59;">Sign in →</a>
        </p>
      </form>
    `;
  }

  if (type === "login") {
    html = `
      <div class="eyebrow">PORTAL ACCESS</div>
      <h2>Sign in to Sahaaya</h2>
      <p>Enter your credentials to access your verified profile and portal.</p>

      <!-- 1-Click Demo Evaluation Access -->
      <div style="background: #f0f5f2; border: 1px solid #c6ddd3; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
        <span style="font-size: 10px; font-weight: 800; color: #174e43; letter-spacing: 0.8px; display: block; margin-bottom: 10px; text-transform: uppercase;">
          ⚡ 1-Click Demo Access for Evaluators
        </span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="btn secondary" style="justify-content: flex-start; padding: 8px 12px; font-size: 13px;" onclick="SahaayaAuth.switchDemoRole('volunteer')">
            <span>👤</span> <strong>Volunteer Portal</strong> — Ananya Sharma →
          </button>
          <button type="button" class="btn secondary" style="justify-content: flex-start; padding: 8px 12px; font-size: 13px;" onclick="SahaayaAuth.switchDemoRole('home')">
            <span>🏡</span> <strong>Old Age Home Portal</strong> — Silver Springs Care →
          </button>
          <button type="button" class="btn secondary" style="justify-content: flex-start; padding: 8px 12px; font-size: 13px;" onclick="SahaayaAuth.switchDemoRole('admin')">
            <span>🛡️</span> <strong>Admin Portal</strong> — Platform Operations →
          </button>
        </div>
      </div>

      <div style="text-align: center; color: #9eada8; font-size: 11px; margin: 12px 0; font-weight: 700; letter-spacing: 0.5px;">— OR SIGN IN WITH REAL ACCOUNT —</div>

      <form class="form" id="loginForm">
        <input required type="email" id="loginEmail" placeholder="Email address">
        <input required type="password" id="loginPassword" placeholder="Password">
        <button class="btn primary" type="submit" id="loginSubmitBtn">Sign in →</button>
      </form>
    `;
  }

  if (type === "home") {
    html = `
      <div class="eyebrow">PARTNER WITH US</div>
      <h2>Register your home.</h2>
      <p>Tell us what your residents need. You define the requirements; Sahaaya helps coordinate the right volunteers.</p>
      <form class="form" id="homeForm">
        <div class="field"><label>Home name</label><input required id="homeRegName" placeholder="e.g. Vandana Senior Living" value="Vandana Senior Living"></div>
        <div class="field"><label>Coordinator</label><input required id="homeRegContact" placeholder="Chief coordinator / superintendent" value="Dr. S. K. Narayan"></div>
        <div class="field"><label>Area</label><input required id="homeRegArea" placeholder="Area / neighbourhood" value="Jayanagar, Bengaluru"></div>
        <div class="field field-wide"><label>Address</label><input required id="homeRegAddress" placeholder="Full street address" value="34, 4th Block, Near Central Library"></div>
        <div class="field"><label>Contact email</label><input required id="homeRegEmail" type="email" placeholder="name@home.org"></div>
        <div class="field"><label>Password</label><input required id="homeRegPassword" type="password" placeholder="Minimum 6 characters" minlength="6"></div>
        <div class="field"><label>Phone</label><input required id="homeRegPhone" placeholder="+91" value="+91 80 2663 1122"></div>
        <div class="field"><label>Resident capacity</label><input required id="homeRegResidents" type="number" placeholder="Number of residents" value="35"></div>
        <button class="btn primary" type="submit" id="homeSubmitBtn">Register Home &amp; Create Account →</button>
      </form>
    `;
  }

  if (activity) {
    html = `
      <div class="eyebrow">OPPORTUNITY</div>
      <h2>${activity}</h2>
      <p>
        <b>Silver Springs Home · Whitefield</b><br><br>
        Sunday · 11:00 AM–1:00 PM<br>
        3 volunteer spots remaining<br><br>
        A relaxed afternoon of conversation, stories, and board games with residents. No special expertise required — just time, patience, and a willingness to connect.
      </p>
      <button class="btn primary" id="applyBtn">Apply in Volunteer Portal →</button>
    `;
  }

  if (legacyContent) legacyContent.innerHTML = html;
  if (legacyModal)   legacyModal.classList.add("open");

  // Switch to login link inside join form
  document.getElementById("switchToLogin")?.addEventListener("click", e => {
    e.preventDefault();
    openLandingModal("login");
  });

  // Volunteer registration
  const joinForm = document.getElementById("joinForm");
  if (joinForm) {
    joinForm.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = document.getElementById("joinSubmitBtn");
      btn.disabled = true; btn.textContent = "Creating account...";
      try {
        const res = await SahaayaAuth.registerVolunteer({
          name:         document.getElementById("joinName").value.trim(),
          email:        document.getElementById("joinEmail").value.trim(),
          password:     document.getElementById("joinPassword").value,
          phone:        document.getElementById("joinPhone").value.trim(),
          interests:    [document.getElementById("joinInterest").value],
          availability: [document.getElementById("joinAvailability").value]
        });
        legacyModal.classList.remove("open");
        if (res.needsConfirmation) {
          showLandingToast("Account created! Check your email to confirm before signing in.", "success");
        } else {
          showLandingToast("Volunteer account created! Opening portal...", "success");
          setTimeout(() => window.location.href = "volunteer/", 600);
        }
      } catch (err) {
        showLandingToast("Error: " + err.message, "error");
        btn.disabled = false; btn.textContent = "Create Volunteer Account →";
      }
    });
  }

  // Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = document.getElementById("loginSubmitBtn");
      btn.disabled = true; btn.textContent = "Authenticating...";
      try {
        const user = await SahaayaAuth.login(
          document.getElementById("loginEmail").value.trim(),
          document.getElementById("loginPassword").value
        );
        legacyModal.classList.remove("open");
        showLandingToast(`Welcome back, ${user.name}!`, "success");
        setTimeout(() => {
          const portals = { home: "home/", admin: "admin/", volunteer: "volunteer/" };
          window.location.href = portals[user.role] || "volunteer/";
        }, 500);
      } catch (err) {
        showLandingToast("Login failed: " + err.message, "error");
        btn.disabled = false; btn.textContent = "Sign in →";
      }
    });
  }

  // Home registration
  const homeForm = document.getElementById("homeForm");
  if (homeForm) {
    homeForm.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = document.getElementById("homeSubmitBtn");
      btn.disabled = true; btn.textContent = "Registering home...";
      try {
        const res = await SahaayaAuth.registerHome({
          homeName:      document.getElementById("homeRegName").value.trim(),
          contactPerson: document.getElementById("homeRegContact").value.trim(),
          address:       document.getElementById("homeRegAddress").value.trim(),
          city:          document.getElementById("homeRegArea").value.trim(),
          email:         document.getElementById("homeRegEmail").value.trim(),
          password:      document.getElementById("homeRegPassword").value,
          phone:         document.getElementById("homeRegPhone").value.trim(),
          description:   "Registered community senior home dedicated to active volunteer engagement."
        });
        legacyModal.classList.remove("open");
        if (res.needsConfirmation) {
          showLandingToast("Home registration created! Check your email to confirm.", "success");
        } else {
          showLandingToast("Home account created! Opening Home Portal...", "success");
          setTimeout(() => window.location.href = "home/", 600);
        }
      } catch (err) {
        showLandingToast("Error: " + err.message, "error");
        btn.disabled = false; btn.textContent = "Register Home & Create Account →";
      }
    });
  }

  document.getElementById("applyBtn")?.addEventListener("click", () => {
    legacyModal.classList.remove("open");
    window.location.href = "volunteer/";
  });
}

// -------------------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------------------
document.querySelectorAll("[data-modal]").forEach(b => {
  b.addEventListener("click", () => openLandingModal(b.dataset.modal));
});

document.querySelectorAll(".apply").forEach(b => {
  b.addEventListener("click", () => openLandingModal("activity", b.dataset.activity));
});

document.getElementById("closeModal")?.addEventListener("click", () => {
  if (legacyModal) legacyModal.classList.remove("open");
});
document.querySelector(".modal-backdrop")?.addEventListener("click", () => {
  if (legacyModal) legacyModal.classList.remove("open");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && legacyModal) legacyModal.classList.remove("open");
});

// Heart toggle
document.querySelectorAll(".heart").forEach(h => {
  h.addEventListener("click", () => {
    h.textContent = h.textContent === "♡" ? "♥" : "♡";
    h.style.color = h.textContent === "♥" ? "#b65f57" : "";
  });
});

// Category filters
document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    document.querySelectorAll(".opp-card").forEach(c => {
      c.style.display = (f === "all" || c.dataset.type === f) ? "" : "none";
    });
  });
});

document.getElementById("menuBtn")?.addEventListener("click", () => {
  showLandingToast("Use the portal links in the nav, or explore the sections below.", "info");
});

// Check if redirected due to login_required
if (window.location.search.includes("login_required=1")) {
  setTimeout(() => {
    showLandingToast("Please sign in or use the Demo Role Switcher to access a portal.", "warning");
    openLandingModal("login");
  }, 400);
}
