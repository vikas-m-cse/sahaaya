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
      <div class="signup-experience">
        <div class="eyebrow">NEW TO SAHAAYA?</div><h2>Create your volunteer account.</h2>
        <p>Register with your email and password. Your phone number helps care homes contact you.</p>
        <form class="form" id="joinForm">
          <div class="field field-wide"><label for="joinName">Full name</label><input required id="joinName" placeholder="Your full name" autocomplete="name"></div>
          <div class="field field-wide"><label for="joinEmail">Email address</label><input required id="joinEmail" type="email" placeholder="you@example.com" autocomplete="email"></div>
          <div class="field field-wide"><label for="joinPassword">Create password</label><input required id="joinPassword" type="password" placeholder="At least 8 characters" minlength="8" autocomplete="new-password"></div>
          <div class="field field-wide"><label for="joinPhone">Mobile number</label><div class="signup-phone-row"><select id="joinCountryCode" aria-label="Country calling code"><option value="+91" selected>India +91</option><option value="+1">USA +1</option><option value="+44">UK +44</option><option value="+971">UAE +971</option><option value="+61">Australia +61</option><option value="+65">Singapore +65</option></select><input required id="joinPhone" type="tel" placeholder="98765 43210" autocomplete="tel" inputmode="numeric"></div></div>
          <div class="field"><label for="joinInterest">I want to help with</label><select id="joinInterest"><option value="companionship">Companionship and Storytelling</option><option value="recreation">Recreation and Board Games</option><option value="music">Music and Cultural</option><option value="assistive">Digital and Smartphone Help</option><option value="creative">Creative and Arts</option><option value="outdoors">Outdoors and Gentle Walks</option></select></div>
          <div class="field"><label for="joinAvailability">When I am free</label><select id="joinAvailability"><option value="sun_morning">Sunday Morning</option><option value="sat_evening">Saturday Evening</option><option value="sat_morning">Saturday Morning</option><option value="weekday_evening">Weekday Evenings</option></select></div>
          <button class="btn primary" type="submit" id="joinSubmitBtn">Create account</button>
          <p class="signup-status" id="signupStatus" role="status" aria-live="polite">We'll send an email confirmation link before your first sign-in.</p>
          <p class="signup-switch">Already registered? <a href="#" id="switchToLogin">Login instead</a></p>
        </form>
      </div>`;
  }
  if (type === "login") {
    html = `
      <div class="login-experience">
        <aside class="login-story"><a class="login-brand" href="/" aria-label="Sahaaya home"><span class="login-brand-mark">sa</span><span>SAHAAYA</span></a><div class="login-story-copy"><span class="login-story-kicker">A LITTLE TIME. A LOT OF HUMANITY.</span><h2>Make room for<br><em>meaningful moments.</em></h2><p>Sign in securely to discover opportunities, connect with care homes and keep your volunteering journey moving.</p></div><div class="login-story-foot"><span class="login-story-dot"></span> VERIFIED HOMES <i>·</i> REAL CONNECTIONS</div><div class="login-story-orbit" aria-hidden="true"></div></aside>
        <section class="login-main"><div class="login-heading"><div class="eyebrow">SECURE PORTAL ACCESS</div><h2>Welcome <em>back.</em></h2><p>Sign in with your registered email and password.</p></div>
          <form class="otp-form" id="passwordLoginForm"><div class="login-field"><label for="loginEmail">EMAIL ADDRESS</label><input required type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email"></div><div class="login-field"><label for="loginPassword">PASSWORD</label><input required type="password" id="loginPassword" placeholder="Your password" autocomplete="current-password"></div><button class="login-submit" type="submit" id="passwordLoginBtn"><span>Sign in</span><span aria-hidden="true">↗</span></button></form>
          <button class="otp-resend" type="button" id="forgotPasswordBtn">Forgot password?</button><p class="otp-status" id="otpStatus" role="status" aria-live="polite">Use the email address linked to your Sahaaya account.</p><p class="login-create-account">New to Sahaaya? <a href="#" id="switchToSignup">Create an account</a></p><p class="login-footnote"><span aria-hidden="true">⌁</span> Secure email and password authentication.</p>
        </section>
      </div>`;
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
  const modalCard = legacyModal?.querySelector(".modal-card");
  modalCard?.classList.toggle("login-layout", type === "login");
  if (legacyModal) legacyModal.classList.add("open");

  // Switch to login link inside join form
  document.getElementById("switchToLogin")?.addEventListener("click", e => {
    e.preventDefault();
    openLandingModal("login");
  });
  document.getElementById("switchToSignup")?.addEventListener("click", e => { e.preventDefault(); openLandingModal("join"); });

  // Volunteer registration with email + password.
  const joinForm = document.getElementById("joinForm");
  const setSignupStatus = (message, error = false) => { const status=document.getElementById("signupStatus"); if(status){status.textContent=message;status.classList.toggle("error",error);} };
  if(joinForm) joinForm.addEventListener("submit",async event=>{
    event.preventDefault(); const button=document.getElementById("joinSubmitBtn"); button.disabled=true; button.textContent="Creating account…";
    try{
      const digits=document.getElementById("joinPhone").value.trim().replace(/\D/g,"");
      const phone=document.getElementById("joinCountryCode").value+digits;
      if(!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Enter a valid phone number with the selected country code.");
      const result=await SahaayaAuth.registerVolunteer({
        name:document.getElementById("joinName").value.trim(),
        email:document.getElementById("joinEmail").value.trim().toLowerCase(),
        password:document.getElementById("joinPassword").value,
        phone, interests:[document.getElementById("joinInterest").value],
        availability:[document.getElementById("joinAvailability").value], preferred_area:"Bengaluru"
      });
      if(result.needsConfirmation){setSignupStatus("Account created. Check your email and click the confirmation link before signing in.");button.textContent="Confirmation email sent";return;}
      legacyModal.classList.remove("open");showLandingToast("Your volunteer account is ready. Welcome to Sahaaya!","success");setTimeout(()=>window.location.href="volunteer/",500);
    }catch(error){setSignupStatus(error.message||"Could not create your account. Please try again.",true);button.disabled=false;button.textContent="Create account";}
  });

  // Email/password login and password recovery.
  const loginForm=document.getElementById("passwordLoginForm"), otpStatus=document.getElementById("otpStatus");
  const setLoginStatus=(message,isError=false)=>{if(otpStatus){otpStatus.textContent=message;otpStatus.classList.toggle("error",isError);}};
  if(loginForm) loginForm.addEventListener("submit",async event=>{
    event.preventDefault();const button=document.getElementById("passwordLoginBtn");button.disabled=true;button.querySelector("span").textContent="Signing in…";
    try{const user=await SahaayaAuth.loginWithPassword(document.getElementById("loginEmail").value.trim().toLowerCase(),document.getElementById("loginPassword").value);
      legacyModal.classList.remove("open");showLandingToast("Welcome back, "+(user.name||"to Sahaaya")+"!","success");
      setTimeout(()=>{const portals={home:"home/",admin:"admin/",volunteer:"volunteer/"};const dest=new URL(portals[user.role]||"volunteer/",window.location.href);const activity=new URLSearchParams(window.location.search).get("activity");if(user.role==="volunteer"&&activity)dest.searchParams.set("activity",activity);window.location.href=dest.href;},450);
    }catch(error){setLoginStatus(error.message||"Unable to sign in. Check your email and password.",true);button.disabled=false;button.querySelector("span").textContent="Sign in";}
  });
  document.getElementById("forgotPasswordBtn")?.addEventListener("click",async()=>{
    const email=document.getElementById("loginEmail")?.value.trim().toLowerCase();if(!email){setLoginStatus("Enter your email address first, then select Forgot password.",true);return;}
    const button=document.getElementById("forgotPasswordBtn");button.disabled=true;
    try{await SahaayaAuth.sendPasswordReset(email);setLoginStatus("If an account exists for this email, a password-reset link has been sent. Check your inbox and spam folder.");}
    catch(error){setLoginStatus(error.message||"Could not send the reset email.",true);}finally{button.disabled=false;}
  });
  if(new URLSearchParams(window.location.search).has("reset_password")){
    const recovery=document.createElement("div");recovery.className="modal open";
    recovery.innerHTML='<div class="modal-backdrop"></div><div class="modal-card"><button class="close" type="button" aria-label="Close">×</button><div class="eyebrow">ACCOUNT RECOVERY</div><h2>Choose a new password.</h2><form class="form" id="newPasswordForm"><div class="field field-wide"><label for="newPassword">New password</label><input required id="newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><button class="btn primary" type="submit">Update password</button><p class="signup-status" id="resetStatus" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(recovery);recovery.querySelector(".close").addEventListener("click",()=>recovery.remove());recovery.querySelector(".modal-backdrop").addEventListener("click",()=>recovery.remove());
    recovery.querySelector("#newPasswordForm").addEventListener("submit",async event=>{event.preventDefault();const btn=recovery.querySelector('button[type="submit"]'),status=recovery.querySelector("#resetStatus");btn.disabled=true;btn.textContent="Updating…";
      try{await SahaayaAuth.updatePassword(recovery.querySelector("#newPassword").value);status.textContent="Password updated. You can now sign in.";window.history.replaceState({},document.title,window.location.pathname);setTimeout(()=>recovery.remove(),1800);}
      catch(error){status.textContent=error.message||"Could not update password. Request a new reset link.";status.classList.add("error");btn.disabled=false;btn.textContent="Update password";}
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
    showLandingToast("Please sign in with your email or phone to access a portal.", "warning");
    openLandingModal("login");
  }, 400);
}


/* Sahaaya signature motion layer */
(() => {
  const root = document.documentElement;
  let tx = 50, ty = 50, rx = 50, ry = 50;
  window.addEventListener("pointermove", e => {
    tx = (e.clientX / innerWidth) * 100;
    ty = (e.clientY / innerHeight) * 100;
  }, {passive:true});
  const tick = () => {
    rx += (tx-rx)*0.045;
    ry += (ty-ry)*0.045;
    root.style.setProperty("--mx", rx + "%");
    root.style.setProperty("--my", ry + "%");
    requestAnimationFrame(tick);
  };
  tick();

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    document.querySelectorAll(".manifesto,.signal-band,.opportunities,.connection,.match-section,.how,.homes,.closing").forEach(el => {
      el.classList.add("reveal-section");
      reveal.observe(el);
    });
  }
})();


/* Sahaaya interaction layer — product-first finder */
(() => {
  const map={
    conversation:{sunday:['Sunday Social Afternoon','Conversation, board games and an unhurried afternoon in Whitefield.'],saturday:['Weekend Conversation Circle','Stories, tea and relaxed conversation in Indiranagar.'],weekday:['Afternoon Companionship','A quieter weekday hour with residents in Whitefield.']},
    music:{sunday:['Sunday Music Circle','Bring a favourite song and spend an afternoon singing together.'],saturday:['Music & Antakshari','Bring a favourite song. Someone may already know every word.'],weekday:['Midweek Music Hour','Songs, rhythm and a little energy for the afternoon.']},
    creative:{sunday:['Art & Memory Wall','Turn drawings, stories and small memories into something shared.'],saturday:['Creative Saturday','Make, sketch and create something residents can keep.'],weekday:['Creative Hour','A relaxed making session built around simple materials.']},
    recreation:{sunday:['Sunday Game Table','Board games, cards and a table full of easy conversation.'],saturday:['Saturday Game Hour','Bring your favourite game and stay for a while.'],weekday:['Weekday Games','A friendly hour of cards, puzzles and company.']}
  };
  let interest='conversation',day='sunday';
  const title=document.getElementById('finderTitle'),textEl=document.getElementById('finderText');
  function update(){const x=(map[interest]||map.conversation)[day]||map.conversation.sunday; if(title)title.textContent=x[0];if(textEl)textEl.textContent=x[1];}
  document.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.choice-row');row.querySelectorAll('.choice').forEach(x=>x.classList.remove('active'));btn.classList.add('active');if(row.dataset.choice==='interest')interest=btn.dataset.value;else day=btn.dataset.value;update();}));
  const progress=document.getElementById('progress');
  window.addEventListener('scroll',()=>{if(progress)progress.style.width=(scrollY/(document.documentElement.scrollHeight-innerHeight)*100)+'%';},{passive:true});
  update();
})();


/* Sahaaya physical-pointer interactions */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || 'ontouchstart' in window) return;
  const magnetic = document.querySelectorAll('.hero-primary,.nav-cta,.experience-action,.result-arrow,.final-cta,.outline-cta');
  magnetic.forEach(el => {
    el.addEventListener('pointermove', e => {
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left-r.width/2)/r.width;
      const y=(e.clientY-r.top-r.height/2)/r.height;
      el.style.setProperty('--mag-x', (x*8).toFixed(2)+'px');
      el.style.setProperty('--mag-y', (y*6).toFixed(2)+'px');
    });
    el.addEventListener('pointerleave',()=>{el.style.setProperty('--mag-x','0px');el.style.setProperty('--mag-y','0px');});
  });

  document.querySelectorAll('.hero-experience,.need-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left-r.width/2)/r.width;
      const y=(e.clientY-r.top-r.height/2)/r.height;
      card.style.setProperty('--spot-x',(x*100+50)+'%');
      card.style.setProperty('--spot-y',(y*100+50)+'%');
    });
  });
})();


/* Signature Sahaaya hour selector */
(() => {
  const hours=document.querySelectorAll('.hour-chip'), days=document.querySelectorAll('.day-chip');
  const summary=document.getElementById('hourSummary'), match=document.getElementById('hourMatch'), box=document.querySelector('.hour-picker'), explore=document.getElementById('hourExplore');
  if(!summary||!match) return;
  let h='1', d='Sunday';
  const counts={"1|Sunday":3,"1|Saturday":5,"1|Weekday":2,"2|Sunday":7,"2|Saturday":4,"2|Weekday":5,"3|Sunday":4,"3|Saturday":3,"3|Weekday":6};
  const update=()=>{summary.textContent=(h==='3'?'3+':h)+' hour'+(h==='1'?'':'s')+' · '+d;match.textContent=(counts[h+'|'+d]||3)+' moments nearby';box.classList.remove('is-updating');void box.offsetWidth;box.classList.add('is-updating');};
  hours.forEach(x=>x.addEventListener('click',()=>{hours.forEach(y=>y.classList.remove('active'));x.classList.add('active');h=x.dataset.hours;update();}));
  days.forEach(x=>x.addEventListener('click',()=>{days.forEach(y=>y.classList.remove('active'));x.classList.add('active');d=x.dataset.day;update();}));
  explore?.addEventListener('click',()=>document.getElementById('finder')?.scrollIntoView({behavior:'smooth',block:'start'}));
})();


/* Living hour dock — keeps the chosen intention present while exploring */
(() => {
  const dock=document.getElementById('hourDock'), dockSummary=document.getElementById('dockSummary'), dockCount=document.getElementById('dockCount'), explore=document.getElementById('dockExplore');
  const hero=document.querySelector('.hero-product');
  if(!dock||!hero) return;
  const counts={"1|Sunday":3,"1|Saturday":5,"1|Weekday":2,"2|Sunday":7,"2|Saturday":4,"2|Weekday":5,"3|Sunday":4,"3|Saturday":3,"3|Weekday":6};
  let h='1',d='Sunday';
  const refresh=()=>{dockSummary.textContent=(h==='3'?'3+':h)+' hour'+(h==='1'?'':'s')+' · '+d;dockCount.textContent=(counts[h+'|'+d]||3)+' nearby';};
  document.querySelectorAll('.hour-chip').forEach(x=>x.addEventListener('click',()=>{h=x.dataset.hours;refresh();}));
  document.querySelectorAll('.day-chip').forEach(x=>x.addEventListener('click',()=>{d=x.dataset.day;refresh();}));
  explore?.addEventListener('click',()=>document.getElementById('finder')?.scrollIntoView({behavior:'smooth'}));
  const onScroll=()=>dock.classList.toggle('visible',scrollY>hero.offsetHeight*.72);
  addEventListener('scroll',onScroll,{passive:true});onScroll();refresh();
})();


/* Signature page choreography */
(() => {
  const nav=document.querySelector('.site-nav'), rail=document.querySelector('.chapter-rail'), fill=document.getElementById('railFill');
  const targets=[...document.querySelectorAll('.rail-dot')].map(x=>({btn:x,el:document.getElementById(x.dataset.target)})).filter(x=>x.el);
  const sections=[...document.querySelectorAll('main > section')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');reveal.unobserve(e.target);}}),{threshold:.14});
  document.querySelectorAll('.intro-section,.needs-section,.match-section,.story-section,.steps-section,.homes-section,.portal-bridge,.final-section').forEach((el,i)=>{el.classList.add('reveal-orchestrated');el.dataset.delay=String(i%5);reveal.observe(el);});
  const update=()=>{
    nav?.classList.toggle('scrolled',scrollY>45);
    const y=scrollY+innerHeight*.38;
    let active=targets[0]; targets.forEach(t=>{if(t.el.offsetTop<=y) active=t;});
    targets.forEach(t=>t.btn.classList.toggle('active',t===active));
    if(fill&&active){const idx=targets.indexOf(active);fill.style.height=((idx)/(Math.max(targets.length-1,1))*100)+'%';}
  };
  addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
  targets.forEach(t=>t.btn.addEventListener('click',()=>t.el.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})));
})();

/* Hero image follows the pointer by a few pixels — intentionally restrained */
(() => {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card=document.querySelector('.hero-experience'); const img=card?.querySelector('img'); if(!card||!img) return;
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;img.style.setProperty('--img-x',(x*5)+'px');img.style.setProperty('--img-y',(y*4)+'px');});
  card.addEventListener('pointerleave',()=>{img.style.setProperty('--img-x','0px');img.style.setProperty('--img-y','0px');});
})();


/* Reliable hour selector: one shared state for the picker and floating dock. */
(() => {
  const picker = document.querySelector('.hour-picker');
  if (!picker) return;

  const dock = document.getElementById('hourDock');
  const summary = document.getElementById('hourSummary');
  const match = document.getElementById('hourMatch');
  const dockSummary = document.getElementById('dockSummary');
  const dockCount = document.getElementById('dockCount');
  const counts = {
    '1|Sunday': 3, '1|Saturday': 5, '1|Weekday': 2,
    '2|Sunday': 7, '2|Saturday': 4, '2|Weekday': 5,
    '3|Sunday': 4, '3|Saturday': 3, '3|Weekday': 6
  };
  const state = { hours: '1', day: 'Sunday' };

  function render() {
    const count = counts[state.hours + '|' + state.day] ?? 3;
    const duration = state.hours === '3' ? '3+ hours' : state.hours + (state.hours === '1' ? ' hour' : ' hours');
    const label = duration + ' · ' + state.day;

    picker.querySelectorAll('.hour-chip').forEach(button => {
      const active = button.dataset.hours === state.hours;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    picker.querySelectorAll('.day-chip').forEach(button => {
      const active = button.dataset.day === state.day;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (summary) summary.textContent = label;
    if (match) match.textContent = count + ' moments nearby';
    if (dockSummary) dockSummary.textContent = label;
    if (dockCount) dockCount.textContent = count + ' nearby';

    picker.classList.remove('is-updating');
    void picker.offsetWidth;
    picker.classList.add('is-updating');
  }

  // Capture phase makes the controls reliable even if another page interaction
  // handler is added later; both the picker and dock always share one state.
  document.addEventListener('click', event => {
    const hourButton = event.target.closest('.hour-picker .hour-chip');
    const dayButton = event.target.closest('.hour-picker .day-chip');
    if (hourButton) {
      event.preventDefault();
      state.hours = hourButton.dataset.hours || '1';
      render();
    } else if (dayButton) {
      event.preventDefault();
      state.day = dayButton.dataset.day || 'Sunday';
      render();
    }
  }, true);

  render();
})();
