/* Sahaaya landing-page interaction recovery layer.
   Loaded after app.js so the page remains interactive even if an earlier
   optional animation/controller throws during startup. */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { hours: "1", day: "Sunday", interest: "conversation", finderDay: "sunday" };
  const counts = {
    "1|Sunday": 3, "1|Saturday": 5, "1|Weekday": 2,
    "2|Sunday": 7, "2|Saturday": 4, "2|Weekday": 5,
    "3|Sunday": 4, "3|Saturday": 3, "3|Weekday": 6
  };
  const finderMatches = {
    conversation: {
      sunday: ["Sunday Social Afternoon", "Conversation, board games and an unhurried afternoon in Whitefield."],
      saturday: ["Weekend Conversation Circle", "Stories, tea and relaxed conversation in Indiranagar."],
      weekday: ["Afternoon Companionship", "A quieter weekday hour with residents in Whitefield."]
    },
    music: {
      sunday: ["Sunday Music Circle", "Bring a favourite song and spend an afternoon singing together."],
      saturday: ["Music & Antakshari", "Bring a favourite song. Someone may already know every word."],
      weekday: ["Midweek Music Hour", "Songs, rhythm and a little energy for the afternoon."]
    },
    creative: {
      sunday: ["Art & Memory Wall", "Turn drawings, stories and small memories into something shared."],
      saturday: ["Creative Saturday", "Make, sketch and create something residents can keep."],
      weekday: ["Creative Hour", "A relaxed making session built around simple materials."]
    },
    recreation: {
      sunday: ["Sunday Game Table", "Board games, cards and a table full of easy conversation."],
      saturday: ["Saturday Game Hour", "Bring your favourite game and stay for a while."],
      weekday: ["Weekday Games", "A friendly hour of cards, puzzles and company."]
    }
  };

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function renderHours() {
    const label = (state.hours === "3" ? "3+ hours" : state.hours + (state.hours === "1" ? " hour" : " hours")) + " · " + state.day;
    const count = counts[state.hours + "|" + state.day] ?? 3;
    const picker = $(".hour-picker");
    if (picker) {
      $$(".hour-chip", picker).forEach(b => {
        const active = b.dataset.hours === state.hours;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      $$(".day-chip", picker).forEach(b => {
        const active = b.dataset.day === state.day;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      picker.classList.remove("is-updating");
      void picker.offsetWidth;
      picker.classList.add("is-updating");
    }
    const summary = $("#hourSummary"), match = $("#hourMatch");
    const dockSummary = $("#dockSummary"), dockCount = $("#dockCount");
    if (summary) summary.textContent = label;
    if (match) match.textContent = count + " moments nearby";
    if (dockSummary) dockSummary.textContent = label;
    if (dockCount) dockCount.textContent = count + " nearby";
  }

  function renderFinder() {
    const match = (finderMatches[state.interest] || finderMatches.conversation)[state.finderDay] || finderMatches.conversation.sunday;
    const title = $("#finderTitle"), description = $("#finderText");
    if (title) title.textContent = match[0];
    if (description) description.textContent = match[1];
    $$(".choice-row").forEach(row => {
      const selected = row.dataset.choice === "interest" ? state.interest : state.finderDay;
      $$(".choice", row).forEach(b => {
        const active = b.dataset.value === selected;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    });
  }

  function fallbackModal(type, activity) {
    const modal = $("#modal"), content = $("#modalContent");
    if (!modal || !content) return;
    const copy = {
      join: ["BECOME A VOLUNTEER", "Join Sahaaya", "Create a volunteer profile to discover opportunities at verified partner homes."],
      login: ["PORTAL ACCESS", "Sign in to Sahaaya", "Use the demo role switcher or sign in with your account."],
      home: ["PARTNER WITH US", "Register your home", "Partner homes can publish real requirements for volunteers."]
    };
    const data = copy[type] || ["OPPORTUNITY", activity || "Discover a moment", "Explore this opportunity in the volunteer portal."];
    content.innerHTML = '<div class="eyebrow">' + data[0] + '</div><h2>' + data[1] + '</h2><p>' + data[2] + '</p><button class="btn primary" id="fallbackPortalGo" type="button">Open Sahaaya portal →</button>';
    modal.classList.add("open");
    $("#fallbackPortalGo")?.addEventListener("click", () => { window.location.href = "volunteer/"; });
  }

  function openModal(type, activity) {
    if (typeof window.openLandingModal === "function") window.openLandingModal(type, activity);
    else fallbackModal(type, activity);
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const modalTrigger = target.closest("[data-modal]");
    if (modalTrigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal(modalTrigger.dataset.modal);
      return;
    }

    const applyTrigger = target.closest(".apply");
    if (applyTrigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal("activity", applyTrigger.dataset.activity || "Volunteer opportunity");
      return;
    }

    if (target.closest("#closeModal, .modal-backdrop")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $("#modal")?.classList.remove("open");
      return;
    }

    const filter = target.closest(".filter");
    if (filter) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $$(".filter").forEach(b => b.classList.toggle("active", b === filter));
      const value = filter.dataset.filter || "all";
      $$(".opp-card").forEach(card => { card.hidden = value !== "all" && card.dataset.type !== value; });
      return;
    }

    const hour = target.closest(".hour-chip");
    if (hour) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.hours = hour.dataset.hours || "1";
      renderHours();
      return;
    }

    const day = target.closest(".day-chip");
    if (day) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.day = day.dataset.day || "Sunday";
      renderHours();
      return;
    }

    const choice = target.closest(".choice");
    if (choice) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const row = choice.closest(".choice-row");
      if (row?.dataset.choice === "interest") state.interest = choice.dataset.value || "conversation";
      if (row?.dataset.choice === "day") state.finderDay = choice.dataset.value || "sunday";
      renderFinder();
      return;
    }

    if (target.closest("#hourExplore, #dockExplore")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollToId("finder");
      return;
    }

    const rail = target.closest(".rail-dot");
    if (rail) {
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollToId(rail.dataset.target);
      return;
    }

    if (target.closest("#menuBtn")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const nav = $(".site-nav");
      const open = nav?.classList.toggle("menu-open") || false;
      $("#menuBtn")?.setAttribute("aria-expanded", String(open));
      return;
    }
  }, true);

  // Close the mobile navigation after selecting a section.
  $$(".nav-links a").forEach(link => link.addEventListener("click", () => {
    $(".site-nav")?.classList.remove("menu-open");
    $("#menuBtn")?.setAttribute("aria-expanded", "false");
  }));

  // Initialise accessible state and ensure the dock reflects the picker.
  renderHours();
  renderFinder();

  // Report controller readiness without blocking the UI.
  document.documentElement.classList.add("sahaaya-interactions-ready");
  console.info("Sahaaya landing interactions ready.");
})();
